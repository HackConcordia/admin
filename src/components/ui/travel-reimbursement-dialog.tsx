"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface TravelReimbursementData {
  approved: boolean;
  amount?: number;
  currency?: string;
}

interface TravelReimbursementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TravelReimbursementData) => void;
  candidateName: string;
}

const CURRENCY_LIMITS = {
  CAD: 150,
  USD: 100,
};

export function TravelReimbursementDialog({
  open,
  onOpenChange,
  onSubmit,
  candidateName,
}: TravelReimbursementDialogProps) {
  const [approved, setApproved] = React.useState<boolean | null>(null);
  const [currency, setCurrency] = React.useState<"CAD" | "USD">("CAD");
  const [amount, setAmount] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");

  const handleSubmit = () => {
    setError("");

    if (approved === null) {
      setError("Please select an option");
      return;
    }

    if (approved) {
      if (!amount || amount.trim() === "") {
        setError("Please enter an amount");
        return;
      }

      const amountNum = parseFloat(amount);

      if (isNaN(amountNum) || amountNum <= 0) {
        setError("Amount must be a positive number");
        return;
      }

      const limit = CURRENCY_LIMITS[currency];
      if (amountNum > limit) {
        setError(`Amount cannot exceed ${limit} ${currency}`);
        return;
      }

      onSubmit({
        approved: true,
        amount: amountNum,
        currency,
      });
    } else {
      onSubmit({
        approved: false,
      });
    }

    handleReset();
  };

  const handleCancel = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setApproved(null);
    setCurrency("CAD");
    setAmount("");
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Travel Reimbursement Decision</DialogTitle>
          <DialogDescription>
            {candidateName} has requested travel reimbursement. Please choose whether to approve
            their request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Decision</Label>
            <RadioGroup
              value={approved === null ? "" : approved ? "yes" : "no"}
              onValueChange={(value) => {
                setApproved(value === "yes");
                setError("");
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="approve-yes" />
                <Label htmlFor="approve-yes" className="font-normal cursor-pointer">
                  Admit with travel reimbursement
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="approve-no" />
                <Label htmlFor="approve-no" className="font-normal cursor-pointer">
                  Admit without travel reimbursement
                </Label>
              </div>
            </RadioGroup>
          </div>

          {approved === true && (
            <div className="space-y-4 rounded-md border p-4">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Currency</Label>
                <RadioGroup value={currency} onValueChange={(value) => setCurrency(value as "CAD" | "USD")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CAD" id="currency-cad" />
                    <Label htmlFor="currency-cad" className="font-normal cursor-pointer">
                      CAD (Maximum: {CURRENCY_LIMITS.CAD})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="USD" id="currency-usd" />
                    <Label htmlFor="currency-usd" className="font-normal cursor-pointer">
                      USD (Maximum: {CURRENCY_LIMITS.USD})
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold">
                  Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder={`Enter amount (max ${CURRENCY_LIMITS[currency]} ${currency})`}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError("");
                  }}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          {error && <div className="text-sm text-red-600 font-medium">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
