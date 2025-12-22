import type { Dispatch } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { WalletIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import type { CreatePaymentForm } from "@repo/validators/payment";
import { createPaymentFormSchema } from "@repo/validators/payment";
import { Button } from "@repo/web-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/web-ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@repo/web-ui/field";
import { Input } from "@repo/web-ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@repo/web-ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/web-ui/tabs";

import { createPayment } from "../../services/paymentService";
import { toastErrors } from "../../util/errorToaster";
import { ResponsiveDialog } from "./responsiveDialog";

export type TransactionDialogState =
  | "deposit"
  | "withdraw"
  | "send"
  | "request";

export interface TransactionDialogProps {
  open: boolean;
  setOpen: Dispatch<boolean>;
  state: TransactionDialogState;
  setState: Dispatch<TransactionDialogState>;
}

function DepositTab() {
  return (
    <form>
      <FieldSet>
        <FieldGroup>
          <FieldSet>
            <Field>
              <FieldLabel>Amount</FieldLabel>
              <InputGroup>
                <InputGroupInput placeholder="0.00" />
                <InputGroupAddon align="inline-end">€</InputGroupAddon>
              </InputGroup>
            </Field>

            <div>
              <p className="text-foreground">Payment</p>
              <Card>
                <CardHeader>
                  <CardTitle>
                    Space I left out for the stripe integration :)
                  </CardTitle>
                </CardHeader>
                <CardContent></CardContent>
              </Card>
            </div>

            <Field>
              <Button>
                <WalletIcon /> Deposit
              </Button>
            </Field>
          </FieldSet>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

function WithdrawTab() {
  return (
    <form>
      <FieldSet>
        <FieldGroup>
          <FieldSet>
            <Field>
              <FieldLabel>Amount</FieldLabel>
              <InputGroup>
                <InputGroupInput placeholder="0.00" />
                <InputGroupAddon align="inline-end">€</InputGroupAddon>
              </InputGroup>
            </Field>

            <div>
              <p className="text-foreground">Payment</p>
              <Card>
                <CardHeader>
                  <CardTitle>
                    Space I left out for the stripe integration :)
                  </CardTitle>
                </CardHeader>
                <CardContent></CardContent>
              </Card>
            </div>

            <Field>
              <Button>
                <WalletIcon /> Deposit
              </Button>
            </Field>
          </FieldSet>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

function SendTab() {
  const router = useRouter();
  const createPaymentMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: async () => {
      toast.success("Success");
      await router.invalidate();
    },
    onError: toastErrors,
  });
  const form = useForm({
    resolver: zodResolver(createPaymentFormSchema),
    disabled: createPaymentMutation.isPending,
  });

  const onSubmit = (values: CreatePaymentForm) => {
    createPaymentMutation.mutate({
      amount: Math.floor(values.amount * 100),
      toUserPhoneNumber: values.userPhoneNumber,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldSet>
        <FieldGroup>
          <FieldSet>
            <Controller
              control={form.control}
              name="amount"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      value={field.value as string}
                      aria-invalid={fieldState.invalid}
                      itemID={field.name}
                      type="number"
                      placeholder="0.00"
                    />
                    <InputGroupAddon align="inline-end">€</InputGroupAddon>
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="userPhoneNumber"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Recipient</FieldLabel>
                  {/* TODO: make phone number */}
                  <Input {...field} id={field.name} placeholder="+3586864371" />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Field>
              <Button>
                <WalletIcon /> Deposit
              </Button>
            </Field>
          </FieldSet>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

function RequestTab() {
  return (
    <form>
      <FieldSet>
        <FieldGroup>
          <FieldSet>
            <Field>
              <FieldLabel htmlFor="amount">Amount</FieldLabel>
              <InputGroup>
                <InputGroupInput itemID="amount" placeholder="0.00" />
                <InputGroupAddon align="inline-end">€</InputGroupAddon>
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="recipient">Recipient</FieldLabel>
              <Input id="recipient" type="tel" placeholder="+3586864371" />
            </Field>

            <Field>
              <Button>
                <WalletIcon /> Deposit
              </Button>
            </Field>
          </FieldSet>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

export function TransactionDialog({
  open,
  setOpen,
  state,
  setState,
}: TransactionDialogProps) {
  return (
    <ResponsiveDialog open={open} setOpen={setOpen}>
      <Tabs
        className="max-w-xl px-3 py-6"
        defaultValue={state}
        onValueChange={(newState) =>
          setState(newState as TransactionDialogState)
        }
      >
        <TabsList className="max-md:w-full">
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="request">Request</TabsTrigger>
        </TabsList>

        <TabsContent value="deposit">
          <DepositTab />
        </TabsContent>
        <TabsContent value="withdraw">
          <WithdrawTab />
        </TabsContent>
        <TabsContent value="send">
          <SendTab />
        </TabsContent>
        <TabsContent value="request">
          <RequestTab />
        </TabsContent>
      </Tabs>
    </ResponsiveDialog>
  );
}
