import type { Dispatch } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import type { CreatePaymentForm } from "@repo/validators/payment";
import type {
  CreateStripePayoutForm,
  GenerateStripeCheckoutRequest,
} from "@repo/validators/stripe";
import { createPaymentFormSchema } from "@repo/validators/payment";
import {
  createStripePayoutFormSchema,
  generateStripeCheckoutRequestSchema,
} from "@repo/validators/stripe";
import { Button } from "@repo/web-ui/button";
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

import type { ApiError } from "../../util/api";
import { createPayment } from "../../services/paymentService";
import {
  createPayout,
  generateStripeCheckout,
  getPayoutEligibility,
  getStripeOnboardingUrl,
} from "../../services/stripeService";
import { toastErrors } from "../../util/errorToaster";
import { SlideToConfirm } from "../slideToConfirm";
import { ResponsiveDialog } from "./responsiveDialog";

export type TransactionDialogState = "deposit" | "withdraw" | "send";

export interface TransactionDialogProps {
  open: boolean;
  setOpen: Dispatch<boolean>;
  state: TransactionDialogState;
  setState: Dispatch<TransactionDialogState>;
}

function DepositTab() {
  const form = useForm({
    resolver: zodResolver(generateStripeCheckoutRequestSchema),
    defaultValues: {
      amount: "",
    },
    reValidateMode: "onBlur",
  });

  const stripeCheckoutMutation = useMutation({
    mutationFn: generateStripeCheckout,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: toastErrors,
  });

  const onSubmit = (values: GenerateStripeCheckoutRequest) => {
    stripeCheckoutMutation.mutate({
      amount: values.amount,
    });
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
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

            <SlideToConfirm
              onConfirm={() => form.handleSubmit(onSubmit)()}
              isLoading={stripeCheckoutMutation.isPending}
              disabled={
                stripeCheckoutMutation.isPending || !form.formState.isValid
              }
            />
          </FieldSet>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

function WithdrawTab({ setOpen }: { setOpen: Dispatch<boolean> }) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(createStripePayoutFormSchema),
    defaultValues: {
      idempotencyKey: crypto.randomUUID(),
      amount: "",
    },
  });

  const eligibilityQuery = useQuery({
    queryKey: ["payoutEligibility"],
    queryFn: getPayoutEligibility,
  });

  const payoutMutation = useMutation({
    mutationFn: createPayout,
    onSuccess: async () => {
      toast.success("Withdrawal initiated successfully");
      await router.invalidate();
      form.reset({ idempotencyKey: crypto.randomUUID(), amount: "" });
      setOpen(false);
    },
    onError: (error: ApiError) => {
      toastErrors(error);
      form.setValue("idempotencyKey", crypto.randomUUID());
    },
  });

  const onSubmit = (values: CreateStripePayoutForm) => {
    payoutMutation.mutate({
      amount: Math.floor(values.amount * 100),
      idempotencyKey: values.idempotencyKey,
    });
  };

  if (eligibilityQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Checking eligibility...</p>
      </div>
    );
  }

  if (eligibilityQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="text-destructive">Failed to check eligibility</p>
        <Button variant="outline" onClick={() => eligibilityQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!eligibilityQuery.data.eligible) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="text-muted-foreground">{eligibilityQuery.data.reason}</p>
        <Button
          onClick={async () => {
            const { url } = await getStripeOnboardingUrl();
            window.location.href = url;
          }}
        >
          Complete Onboarding
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => e.preventDefault()}>
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

            <SlideToConfirm
              onConfirm={() => form.handleSubmit(onSubmit)()}
              isLoading={payoutMutation.isPending}
              disabled={payoutMutation.isPending || !form.formState.isValid}
            />
          </FieldSet>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

function SendTab({ setOpen }: { setOpen: Dispatch<boolean> }) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(createPaymentFormSchema),
    defaultValues: {
      idempotencyKey: crypto.randomUUID(),
      amount: "",
      userPhoneNumber: "",
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: async () => {
      toast.success("Success");
      await router.invalidate();
      form.reset();
      setOpen(false);
    },
    onError: (error: ApiError) => {
      toastErrors(error);
      form.setValue("idempotencyKey", crypto.randomUUID());
    },
  });

  const onSubmit = (values: CreatePaymentForm) => {
    createPaymentMutation.mutate({
      amount: Math.floor(values.amount * 100),
      toUserPhoneNumber: values.userPhoneNumber,
      idempotencyKey: values.idempotencyKey,
    });
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
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
                  <Input
                    {...field}
                    id={field.name}
                    type="tel"
                    placeholder="+3586864371"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <SlideToConfirm
              onConfirm={() => form.handleSubmit(onSubmit)()}
              isLoading={createPaymentMutation.isPending}
              disabled={
                createPaymentMutation.isPending || !form.formState.isValid
              }
            />
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
        </TabsList>

        <TabsContent value="deposit">
          <DepositTab />
        </TabsContent>
        <TabsContent value="withdraw">
          <WithdrawTab setOpen={setOpen} />
        </TabsContent>
        <TabsContent value="send">
          <SendTab setOpen={setOpen} />
        </TabsContent>
      </Tabs>
    </ResponsiveDialog>
  );
}
