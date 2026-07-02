import { Module } from "@nestjs/common";
import { ExpensesController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";
import { VendorPayoutsController } from "./vendor-payouts.controller";
import { VendorPayoutsService } from "./vendor-payouts.service";

@Module({
  controllers: [ExpensesController, VendorPayoutsController],
  providers: [ExpensesService, VendorPayoutsService],
  exports: [ExpensesService, VendorPayoutsService],
})
export class ExpensesModule {}
