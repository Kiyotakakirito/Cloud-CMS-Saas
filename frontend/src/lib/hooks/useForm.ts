// Custom form hooks with React Hook Form integration

import { useForm as useRhf, UseFormProps, FieldValues, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppStore } from '@/lib/store';

interface UseFormOptions<T extends FieldValues> extends UseFormProps<T> {
  schema?: z.ZodSchema<T>;
  defaultValues?: DefaultValues<T>;
  onSubmit: (data: T) => Promise<void> | void;
}

export function useForm<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  ...formOptions
}: UseFormOptions<T>) {
  const { addNotification } = useAppStore();

  const form = useRhf<T>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues,
    ...formOptions,
  });

  const { handleSubmit, formState, reset } = form;

  const onFormSubmit = handleSubmit(async (data) => {
    try {
      await onSubmit(data);
      reset();
    } catch (error: any) {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Form Error',
        message: error.message || 'Failed to submit form',
      });
    }
  });

  return {
    ...form,
    onSubmit: onFormSubmit,
    isSubmitting: formState.isSubmitting,
    isValid: formState.isValid,
  };
}

// Common form schemas
export const schemas = {
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'),
  requiredString: (message = 'This field is required') => z.string().min(1, message),
  optionalString: () => z.string().optional(),
};

// Customer form schema
export const customerSchema = z.object({
  customer_id: schemas.requiredString('Customer ID is required'),
  full_name: schemas.requiredString('Full name is required'),
  email: schemas.email.optional().or(z.literal('')),
  phone: schemas.phone,
  address: schemas.requiredString('Address is required'),
  area: schemas.requiredString('Area is required'),
  city: schemas.requiredString('City is required'),
  pincode: schemas.requiredString('Pincode is required'),
  billing_plan_id: z.number().optional(),
  connection_date: z.string().optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

// Billing plan schema
export const billingPlanSchema = z.object({
  name: schemas.requiredString('Plan name is required'),
  description: schemas.optionalString(),
  price: z.number().min(0, 'Price must be positive'),
  speed_mbps: z.number().min(1, 'Speed must be at least 1 Mbps'),
  data_limit_gb: z.number().optional(),
  is_active: z.boolean().optional().default(true),
});

export type BillingPlanFormData = z.infer<typeof billingPlanSchema>;

// Ticket schema
export const ticketSchema = z.object({
  subject: schemas.requiredString('Subject is required'),
  description: schemas.requiredString('Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  customer_id: z.number(),
});

export type TicketFormData = z.infer<typeof ticketSchema>;