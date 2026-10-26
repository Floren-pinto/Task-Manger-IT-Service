import { FormField, formInputClassName } from "../ui/FormField";

export const taskInputClassName = formInputClassName;

export function TaskFormField(props) {
  return <FormField {...props} />;
}
