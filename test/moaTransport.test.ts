import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock AudioContext globally
const mockAudioContext = {
  currentTime: 0,
  suspend: vi.fn(),
  resume: vi.fn(),
  state: "running",
};

// Mock window.AudioContext
Object.defineProperty(global, "window", {
  value: {
    AudioContext: vi.fn(() => mockAudioContext),
    webkitAudioContext: vi.fn(() => mockAudioContext),
  },
  writable: true,
});

// Import after mocking
import { MoaTransport } from "../utils/MoaTone";

describe("MoaTransport Timing Fix", () => {
  beforeEach(() => {
    // Reset mock state
    mockAudioContext.currentTime = 0;
    MoaTransport.cancel(); // Clear all events
  });

  afterEach(() => {
    MoaTransport.cancel();
  });

  it("should schedule first event in the future, not at current time", () => {
    const callback = vi.fn();
    const currentTime = 1.0; // 1 second
    mockAudioContext.currentTime = currentTime;

    // Schedule a repeating event
    const eventId = MoaTransport.scheduleRepeat(callback, 0.1); // 100ms interval

    // Get the scheduled event to check its nextTime
    const scheduledEvents = (MoaTransport as any).scheduledEvents;
    const event = scheduledEvents.get(eventId);

    expect(event).toBeDefined();
    // The first event should be scheduled at currentTime + scheduleAheadTime (0.025s)
    expect(event.nextTime).toBeGreaterThan(currentTime);
    expect(event.nextTime).toBe(currentTime + 0.025); // scheduleAheadTime is 0.025s
  });

  it("should not trigger callback immediately when nextTime is in the past", () => {
    const callback = vi.fn();
    const currentTime = 1.0;
    mockAudioContext.currentTime = currentTime;

    // Schedule event
    MoaTransport.scheduleRepeat(callback, 0.05); // 50ms interval

    // Simulate time passing to trigger _tick
    mockAudioContext.currentTime = currentTime + 0.1; // 100ms later

    // Manually trigger tick to simulate the scheduler
    (MoaTransport as any)._tick();

    // The callback should be called with the proper scheduled time, not a past time
    expect(callback).toHaveBeenCalled();
    const callTime = callback.mock.calls[0][0];
    expect(callTime).toBeGreaterThanOrEqual(currentTime);
  });

  it("should maintain proper timing intervals for repeating events", () => {
    const callback = vi.fn();
    const currentTime = 0;
    const interval = 0.1; // 100ms
    mockAudioContext.currentTime = currentTime;

    MoaTransport.scheduleRepeat(callback, interval); // Convert to ms

    // Simulate multiple ticks - be more precise about timing
    // First tick: should trigger first event at 0.025
    mockAudioContext.currentTime = 0.03; // Just past first event
    (MoaTransport as any)._tick();

    // Second tick: should trigger second event at 0.125
    mockAudioContext.currentTime = 0.13; // Just past second event
    (MoaTransport as any)._tick();

    // Third tick: should trigger third event at 0.225
    mockAudioContext.currentTime = 0.23; // Just past third event
    (MoaTransport as any)._tick();

    expect(callback).toHaveBeenCalledTimes(3);

    // Check that each call was made with the correct timing
    const callTimes = callback.mock.calls.map((call) => call[0]);
    expect(callTimes[0]).toBe(0.025); // First event at scheduleAheadTime
    expect(callTimes[1]).toBe(0.125); // Second event at 0.025 + 0.1
    expect(callTimes[2]).toBe(0.225); // Third event at 0.025 + 0.2
  });
});
