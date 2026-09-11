import {
  makePeriods,
  type SchedulerState,
  type PortalData,
} from './scheduler.ts';
export type PortalActor = {
  email: string;
  signedIn: boolean;
  organizer: boolean;
  submissionId: string | null;
};
export function visibleData(
  snapshot: { revision: number; state: SchedulerState },
  actor: PortalActor,
): PortalData {
  const state = snapshot.state;
  const own = state.submissions.filter((s) => s.id === actor.submissionId);
  const blocks = actor.organizer
    ? state.blocks
    : state.blocks.filter((b) =>
        own.some(
          (s) =>
            b.track === s.track &&
            b.type === s.type &&
            b.presentationMinutes >= s.durationMinutes,
        ),
      );
  const occupancy: Record<string, number> = {};
  for (const b of blocks)
    for (const p of makePeriods(b))
      occupancy[p.id] = state.submissions.filter(
        (s) => s.assignedPeriodId === p.id && s.id !== actor.submissionId,
      ).length;
  return {
    ...actor,
    revision: snapshot.revision,
    occupancy,
    state: actor.organizer
      ? state
      : {
          submissions: own,
          presenters: state.presenters.filter((p) =>
            own.some((s) => s.presenterId === p.id),
          ),
          blocks,
          log: [],
        },
  };
}
