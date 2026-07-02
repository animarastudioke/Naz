// KaziHQ desktop launcher for Windows.
//
// Double-click this .exe from the root of the KaziHQ repo (next to
// docker-compose.yml). It will:
//  1. Check that Docker Desktop is installed and running.
//  2. Generate local .env files for the api/web apps if they don't exist yet,
//     filling in random JWT secrets so it works out of the box.
//  3. Run `docker compose up --build -d`.
//  4. Wait for the API and web app to come up, then open your browser.
//  5. Keep running so you can stop everything cleanly with Ctrl+C or Enter.
package main

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const (
	apiHealthURL = "http://localhost:4000/health"
	webURL       = "http://localhost:3000"
)

func main() {
	fmt.Println("=========================================")
	fmt.Println("  KaziHQ launcher")
	fmt.Println("=========================================")
	fmt.Println()

	repoRoot, err := findRepoRoot()
	if err != nil {
		fatal(err.Error())
	}
	if err := os.Chdir(repoRoot); err != nil {
		fatal("Could not switch to the KaziHQ folder: " + err.Error())
	}
	fmt.Printf("Using KaziHQ folder: %s\n\n", repoRoot)

	step("Checking Docker Desktop is installed and running")
	if err := checkDocker(); err != nil {
		fatal(err.Error())
	}
	ok("Docker is available")

	step("Preparing local configuration (.env files)")
	created, err := ensureEnvFiles(repoRoot)
	if err != nil {
		fatal(err.Error())
	}
	if created {
		ok("Created default .env files with random secrets (edit apps/api/.env later to add M-Pesa/Stripe/WhatsApp/AI keys)")
	} else {
		ok(".env files already present, leaving them as-is")
	}

	step("Starting KaziHQ (this can take several minutes the first time while images build)")
	if err := dockerComposeUp(); err != nil {
		fatal(err.Error())
	}
	ok("Containers started")

	step("Waiting for the API to become healthy")
	if err := waitForHTTP(apiHealthURL, 5*time.Minute); err != nil {
		fmt.Println()
		fmt.Println("KaziHQ containers are up, but the API didn't respond in time.")
		fmt.Println("Check what's happening with: docker compose logs -f api")
		pauseAndExit(1)
	}
	ok("API is healthy")

	step("Waiting for the web dashboard")
	if err := waitForHTTP(webURL, 2*time.Minute); err != nil {
		fmt.Println()
		fmt.Println("The web app didn't respond in time. Check: docker compose logs -f web")
		pauseAndExit(1)
	}
	ok("Web dashboard is ready")

	fmt.Println()
	fmt.Println("=========================================")
	fmt.Printf("  KaziHQ is running at %s\n", webURL)
	fmt.Println("=========================================")
	fmt.Println()

	openBrowser(webURL)

	fmt.Println("Leave this window open while you use KaziHQ.")
	fmt.Println("Press ENTER to stop KaziHQ and shut down its containers.")
	waitForEnter()

	step("Stopping KaziHQ")
	if err := dockerComposeDown(); err != nil {
		fmt.Println("Warning: " + err.Error())
		fmt.Println("You can stop it manually later with: docker compose down")
	} else {
		ok("Stopped")
	}
	pauseAndExit(0)
}

// findRepoRoot returns the directory the .exe lives in, which is expected to
// be the KaziHQ repo root (the folder containing docker-compose.yml).
func findRepoRoot() (string, error) {
	exePath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("could not determine this program's location: %w", err)
	}
	dir := filepath.Dir(exePath)

	if _, err := os.Stat(filepath.Join(dir, "docker-compose.yml")); err == nil {
		return dir, nil
	}

	// Fall back to the current working directory, in case the exe was moved
	// but launched from within the repo (e.g. via a terminal).
	if cwd, err := os.Getwd(); err == nil {
		if _, err := os.Stat(filepath.Join(cwd, "docker-compose.yml")); err == nil {
			return cwd, nil
		}
	}

	return "", fmt.Errorf(
		"couldn't find docker-compose.yml next to this program.\n" +
			"Make sure KaziHQ.exe is placed in the root of the KaziHQ folder\n" +
			"(the same folder that contains docker-compose.yml, apps/, packages/).",
	)
}

func checkDocker() error {
	if err := exec.Command("docker", "version").Run(); err != nil {
		return fmt.Errorf(
			"Docker doesn't seem to be installed or running.\n" +
				"Install Docker Desktop from https://www.docker.com/products/docker-desktop/,\n" +
				"start it, wait for it to say \"Docker Desktop is running\", then run KaziHQ.exe again.",
		)
	}
	return nil
}

func ensureEnvFiles(repoRoot string) (created bool, err error) {
	apiEnv := filepath.Join(repoRoot, "apps", "api", ".env")
	webEnv := filepath.Join(repoRoot, "apps", "web", ".env")

	if _, err := os.Stat(apiEnv); os.IsNotExist(err) {
		accessSecret, err1 := randomHex(32)
		refreshSecret, err2 := randomHex(32)
		if err1 != nil {
			return false, err1
		}
		if err2 != nil {
			return false, err2
		}

		contents := fmt.Sprintf(`NODE_ENV=production
PORT=4000
DATABASE_URL="postgresql://kazihq:kazihq@postgres:5432/kazihq?schema=public"

JWT_ACCESS_SECRET=%s
JWT_REFRESH_SECRET=%s
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

WEB_APP_URL=http://localhost:3000

MPESA_ENV=sandbox
MPESA_CALLBACK_BASE_URL=http://localhost:4000

STRIPE_WEBHOOK_SECRET=

WHATSAPP_VERIFY_TOKEN=%s
WHATSAPP_API_VERSION=v20.0

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM="KaziHQ <no-reply@kazihq.app>"
`, accessSecret, refreshSecret, accessSecret[:16])

		if err := os.WriteFile(apiEnv, []byte(contents), 0o600); err != nil {
			return false, fmt.Errorf("couldn't write %s: %w", apiEnv, err)
		}
		created = true
	}

	if _, err := os.Stat(webEnv); os.IsNotExist(err) {
		contents := "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1\n"
		if err := os.WriteFile(webEnv, []byte(contents), 0o600); err != nil {
			return false, fmt.Errorf("couldn't write %s: %w", webEnv, err)
		}
		created = true
	}

	return created, nil
}

func randomHex(bytes int) (string, error) {
	buf := make([]byte, bytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func dockerComposeUp() error {
	cmd := exec.Command("docker", "compose", "up", "--build", "-d")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("`docker compose up` failed: %w", err)
	}
	return nil
}

func dockerComposeDown() error {
	cmd := exec.Command("docker", "compose", "down")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func waitForHTTP(url string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	client := &http.Client{Timeout: 3 * time.Second}
	for time.Now().Before(deadline) {
		resp, err := client.Get(url)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode < 500 {
				return nil
			}
		}
		time.Sleep(2 * time.Second)
	}
	return fmt.Errorf("timed out waiting for %s", url)
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start()
}

func waitForEnter() {
	reader := bufio.NewReader(os.Stdin)
	_, _ = reader.ReadString('\n')
}

func pauseAndExit(code int) {
	fmt.Println()
	fmt.Println("Press ENTER to close this window...")
	waitForEnter()
	os.Exit(code)
}

func step(msg string) {
	fmt.Println("-> " + msg)
}

func ok(msg string) {
	fmt.Println("   [OK] " + msg)
}

func fatal(msg string) {
	fmt.Println()
	fmt.Println("ERROR: " + strings.TrimSpace(msg))
	pauseAndExit(1)
}
