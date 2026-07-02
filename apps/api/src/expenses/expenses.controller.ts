import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Permission } from "@kazihq/shared";
import { CurrentBusinessId } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { LogActivity } from "../common/decorators/log-activity.decorator";
import { ExpensesService } from "./expenses.service";
import { CreateExpenseDto, UpdateExpenseDto } from "./dto/expense.dto";

@RequirePermissions(Permission.MANAGE_EXPENSES)
@Controller("expenses")
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  list(@CurrentBusinessId() businessId: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.expensesService.list(businessId, from, to);
  }

  @LogActivity("expense.create", "Expense")
  @Post()
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(businessId, dto);
  }

  @LogActivity("expense.update", "Expense")
  @Patch(":id")
  update(@CurrentBusinessId() businessId: string, @Param("id") id: string, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(businessId, id, dto);
  }

  @LogActivity("expense.delete", "Expense")
  @Delete(":id")
  remove(@CurrentBusinessId() businessId: string, @Param("id") id: string) {
    return this.expensesService.remove(businessId, id);
  }
}
