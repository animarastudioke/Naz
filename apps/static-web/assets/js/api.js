/* Plain-JS API client (no bundler, no modules) so this works whether the page
   is opened directly as a file or served by Netlify. Depends on config.js
   having set window.KAZIHQ_API_URL first. */
(function () {
  var API_URL = window.KAZIHQ_API_URL;

  function getAccessToken() {
    return localStorage.getItem("kazihq_access_token");
  }
  function getRefreshToken() {
    return localStorage.getItem("kazihq_refresh_token");
  }
  function storeTokens(accessToken, refreshToken) {
    localStorage.setItem("kazihq_access_token", accessToken);
    localStorage.setItem("kazihq_refresh_token", refreshToken);
  }
  function clearTokens() {
    localStorage.removeItem("kazihq_access_token");
    localStorage.removeItem("kazihq_refresh_token");
    localStorage.removeItem("kazihq_user");
    localStorage.removeItem("kazihq_business");
  }

  function setSession(data) {
    storeTokens(data.accessToken, data.refreshToken);
    localStorage.setItem("kazihq_user", JSON.stringify(data.user));
    localStorage.setItem("kazihq_business", JSON.stringify(data.business));
  }
  function getUser() {
    var raw = localStorage.getItem("kazihq_user");
    return raw ? JSON.parse(raw) : null;
  }
  function getBusiness() {
    var raw = localStorage.getItem("kazihq_business");
    return raw ? JSON.parse(raw) : null;
  }
  function logout() {
    clearTokens();
    window.location.href = "/login.html";
  }

  /** Redirect to login if there's no session. Call at the top of every dashboard page. */
  function requireAuth() {
    if (!getAccessToken()) {
      window.location.href = "/login.html";
      return false;
    }
    return true;
  }

  async function refreshAccessToken() {
    var refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    var res = await fetch(API_URL + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshToken }),
    });
    if (!res.ok) return null;
    var data = await res.json();
    storeTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  }

  async function request(path, options) {
    options = options || {};
    var method = options.method || "GET";
    var body = options.body;
    var auth = options.auth !== false;

    async function doFetch(token) {
      var headers = {};
      if (!options.raw) headers["Content-Type"] = "application/json";
      if (auth && token) headers["Authorization"] = "Bearer " + token;
      return fetch(API_URL + path, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    var token = auth ? getAccessToken() : null;
    var res = await doFetch(token);

    if (res.status === 401 && auth) {
      token = await refreshAccessToken();
      if (token) res = await doFetch(token);
    }

    if (!res.ok) {
      var message = "Request failed with status " + res.status;
      try {
        var errBody = await res.json();
        message = Array.isArray(errBody.message) ? errBody.message.join(", ") : errBody.message || message;
      } catch (e) {
        /* ignore parse errors */
      }
      var err = new Error(message);
      err.status = res.status;
      throw err;
    }

    if (res.status === 204) return undefined;
    return res.json();
  }

  window.KaziAPI = {
    get: function (path) {
      return request(path, { method: "GET" });
    },
    post: function (path, body) {
      return request(path, { method: "POST", body: body });
    },
    patch: function (path, body) {
      return request(path, { method: "PATCH", body: body });
    },
    delete: function (path) {
      return request(path, { method: "DELETE" });
    },
    public: {
      get: function (path) {
        return request(path, { method: "GET", auth: false });
      },
      post: function (path, body) {
        return request(path, { method: "POST", body: body, auth: false });
      },
    },
    session: {
      set: setSession,
      getUser: getUser,
      getBusiness: getBusiness,
      logout: logout,
      requireAuth: requireAuth,
      isLoggedIn: function () {
        return Boolean(getAccessToken());
      },
    },
  };
})();
