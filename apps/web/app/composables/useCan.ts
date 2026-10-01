import { can, type Action, type TargetArgs } from '@cairnhq/policy'

/** The same permission check the api runs, for deciding what to show. */
export function useCan() {
  const { viewer } = useSession()
  return <A extends Action>(action: A, ...target: TargetArgs<A>) =>
    can(viewer.value, action, ...target)
}
