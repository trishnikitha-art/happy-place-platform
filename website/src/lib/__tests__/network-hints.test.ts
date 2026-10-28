import { getNetworkHints, isConstrainedDevice, subscribeToNetworkHints } from '@/lib/network-hints';

it('treats unsupported optional hints as unknown without throwing', () => {
  expect(getNetworkHints({})).toEqual({ saveData: false, effectiveType: undefined, deviceMemory: undefined });
  expect(isConstrainedDevice(getNetworkHints({}))).toBe(false);
  expect(subscribeToNetworkHints(jest.fn(), {})).not.toThrow();
});

it.each([
  { connection: { saveData: true } },
  { connection: { effectiveType: '2g' } },
  { connection: { effectiveType: 'slow-2g' } },
  { deviceMemory: 1 },
  { connection: { effectiveType: '4g' }, deviceMemory: 1 },
])('suppresses optional work for constrained hints: %j', source => {
  expect(isConstrainedDevice(getNetworkHints(source))).toBe(true);
});

it.each([{ deviceMemory: 2 }, { deviceMemory: 8 }, { deviceMemory: 0 }, { connection: { effectiveType: '4g', saveData: false } }])(
  'does not infer a constraint from %j', source => expect(isConstrainedDevice(getNetworkHints(source))).toBe(false),
);

it('reacts to a data-saver change and removes its exact listener', () => {
  const callbacks = new Set<() => void>();
  const connection = {
    saveData: false,
    addEventListener: jest.fn((_type: string, listener: () => void) => callbacks.add(listener)),
    removeEventListener: jest.fn((_type: string, listener: () => void) => callbacks.delete(listener)),
  };
  const observed: boolean[] = [];
  const changed = () => observed.push(isConstrainedDevice(getNetworkHints({ connection })));
  const cleanup = subscribeToNetworkHints(changed, { connection });
  connection.saveData = true;
  callbacks.forEach(listener => listener());
  expect(observed).toEqual([true]);
  cleanup();
  expect(callbacks.size).toBe(0);
  expect(connection.removeEventListener).toHaveBeenCalledWith('change', changed);
});
