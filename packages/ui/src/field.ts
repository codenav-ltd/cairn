import { inject, type ComputedRef, type InjectionKey } from 'vue'

/** Lets a control inside <UiField> pick up its id, description and error state. */
export interface FieldContext {
  id: string
  describedBy: ComputedRef<string | undefined>
  invalid: ComputedRef<boolean>
}

export const fieldKey: InjectionKey<FieldContext> = Symbol('cairn-field')

export function useField() {
  return inject(fieldKey, null)
}
