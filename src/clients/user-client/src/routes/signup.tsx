import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { parse as parseDate } from "date-fns";
import { BanknoteIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import type {
  CreateUserRequest,
  SignUpFormValues,
} from "@repo/validators/user";
import { signUpFormSchema } from "@repo/validators/user";
import { Button } from "@repo/web-ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/web-ui/card";
import { Checkbox } from "@repo/web-ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@repo/web-ui/field";
import { Input } from "@repo/web-ui/input";

import { signUp } from "../services/authService";
import { toastErrors } from "../util/errorToaster";
import { formatAddress } from "../util/formatters";

export const Route = createFileRoute("/signup")({
  component: RouteComponent,
});

function SignUpForm() {
  const router = useRouter();
  const signUpMutation = useMutation({
    mutationKey: ["sign-up"],
    mutationFn: signUp,
    onSuccess: async () => {
      toast.success("User created, please log in.");
      await router.navigate({ to: "/login", replace: true });
    },
    onError: toastErrors,
  });
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      isResident: false,
      isTruth: false,
    },
    disabled: signUpMutation.isPending,
  });

  const onSubmit = async (values: SignUpFormValues) => {
    const birthDate = parseDate(
      `${values.birthDay}/${values.birthMonth}/${values.birthYear}`,
      "dd/MM/yyyy",
      new Date(),
    );

    const request: CreateUserRequest = {
      firstName: values.firstName,
      lastName: values.lastName,
      address: formatAddress(values.homeAddress, values.postCode, values.city),
      birthDate: birthDate,
      isResident: values.isResident as true,
      isTruth: values.isTruth as true,
      phoneNumber: values.phoneNumber,
    };

    await signUpMutation.mutateAsync(request);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit, console.error)}>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>About you</FieldLegend>
          <FieldDescription>
            We need to know a few things about you to get started
          </FieldDescription>

          <FieldGroup>
            <div className="grid grid-cols-2 gap-2">
              <Controller
                control={form.control}
                name="firstName"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel required htmlFor={field.name}>
                      First name(s)
                    </FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      type="text"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="lastName"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel required htmlFor={field.name}>
                      Last name
                    </FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      type="text"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="phoneNumber"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel required htmlFor={field.name}>
                    Phone number
                  </FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
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

            <FieldSeparator />

            <Controller
              control={form.control}
              name="homeAddress"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel required htmlFor={field.name}>
                    Home address
                  </FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    type="text"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <div className="grid grid-cols-2 gap-2">
              <Controller
                control={form.control}
                name="postCode"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel required htmlFor={field.name}>
                      Postcode
                    </FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      type="text"
                      inputMode="numeric"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="city"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel required htmlFor={field.name}>
                      City
                    </FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      type="text"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <FieldSeparator />

            <div className="grid grid-cols-3 gap-2">
              <Controller
                control={form.control}
                name="birthDay"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel required htmlFor={field.name}>
                      Day
                    </FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      type="string"
                      inputMode="numeric"
                      min="1"
                      max="31"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="birthMonth"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel required htmlFor={field.name}>
                      Month
                    </FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      type="text"
                      inputMode="numeric"
                      min="1"
                      max="12"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="birthYear"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel required htmlFor={field.name}>
                      Year
                    </FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      type="text"
                      inputMode="numeric"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>

          <FieldSeparator />

          <Controller
            control={form.control}
            name="isResident"
            render={({ field, fieldState }) => (
              <Field orientation="horizontal">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                />
                <FieldLabel required htmlFor={field.name}>
                  I am a resident of Finland
                </FieldLabel>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="isTruth"
            render={({ field, fieldState }) => (
              <Field orientation="horizontal">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                />
                <FieldLabel required htmlFor={field.name}>
                  I confirm that all of the above information is correct and
                  true to the best of my knowledge.
                </FieldLabel>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Field>
            <Button disabled={signUpMutation.isPending} type="submit">
              {signUpMutation.isPending ? "Submitting..." : "Sign up"}
            </Button>
          </Field>
        </FieldSet>
      </FieldGroup>
    </form>
  );
}

function RouteComponent() {
  return (
    <div className="m-auto h-screen w-full max-w-sm self-center py-8 md:max-w-4xl">
      <Card className="flex h-10/12 md:h-2/3 flex-row gap-0 overflow-clip p-0">
        <div className="flex w-full flex-col justify-around gap-8 px-4 py-6 md:w-1/2">
          <CardHeader className="w-full">
            <CardTitle className="text-center">Nice to meet you!</CardTitle>
            <CardDescription className="text-center">
              Please provide the following information so we can get started
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto">
            <SignUpForm />
          </CardContent>
          <div /> {/* An empty div to space out the ui evenly */}
        </div>
        <div className="bg-muted text-muted-foreground flex w-1/2 items-center justify-center max-md:collapse max-md:w-0">
          <BanknoteIcon size={48} />
        </div>
      </Card>
    </div>
  );
}
