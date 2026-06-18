import { formatWorkingSchedule, WorkingDay } from '../../libs/crm/provider-core/src/dtos';

// day index: 0=Sun..6=Sat, so Mon=1, Tue=2, Wed=3, Thu=4, Fri=5
const d = (day: number, opensAt: string, closesAt: string, breaks?: WorkingDay['breaks']): WorkingDay =>
  ({ day: day as WorkingDay['day'], opensAt, closesAt, breaks });

describe('formatWorkingSchedule', () => {
  it('collapses three consecutive identical days into a single range', () => {
    const out = formatWorkingSchedule([
      d(1, '09:00', '18:00'),
      d(2, '09:00', '18:00'),
      d(3, '09:00', '18:00'),
    ]);
    expect(out).toBe('Monday-Wednesday: 09.00-18.00');
  });

  it('groups around a day with different hours (worked example)', () => {
    const out = formatWorkingSchedule([
      d(1, '09:00', '18:00'),
      d(2, '09:00', '18:00'),
      d(3, '09:00', '12:00'),
      d(4, '09:00', '18:00'),
      d(5, '09:00', '18:00'),
    ]);
    expect(out).toBe(
      'Monday-Tuesday: 09.00-18.00 • Wednesday: 09.00-12.00 • Thursday-Friday: 09.00-18.00',
    );
  });

  it('does not merge non-adjacent days with the same hours', () => {
    const out = formatWorkingSchedule([d(1, '09:00', '18:00'), d(3, '09:00', '18:00')]);
    expect(out).toBe('Monday: 09.00-18.00 • Wednesday: 09.00-18.00');
  });

  it('formats a single day', () => {
    expect(formatWorkingSchedule([d(1, '09:00', '18:00')])).toBe('Monday: 09.00-18.00');
  });

  it('renders split shifts and merges consecutive days that share them', () => {
    const breaks = [{ startAt: '12:00', endAt: '13:00' }];
    const out = formatWorkingSchedule([d(1, '09:00', '18:00', breaks), d(2, '09:00', '18:00', breaks)]);
    expect(out).toBe('Monday-Tuesday: 09.00-12.00 13.00-18.00');
  });

  it('sorts unordered input into Mon..Sun order', () => {
    const out = formatWorkingSchedule([
      d(0, '10:00', '16:00'), // Sunday
      d(1, '09:00', '18:00'), // Monday
    ]);
    expect(out).toBe('Monday: 09.00-18.00 • Sunday: 10.00-16.00');
  });

  it('returns an empty string for no days', () => {
    expect(formatWorkingSchedule([])).toBe('');
  });
});
