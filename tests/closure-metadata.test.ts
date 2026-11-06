import { afterEach, expect, it, vi } from 'vitest';
import { validate } from '../src/validation.js';
import { formatMessage, sendTelegram } from '../src/telegram.js';

const closed = {
  eventId: 'research:1793886300000:B_CRT:TRADE_CLOSED', eventType: 'TRADE_CLOSED',
  symbol: 'FOREXCOM:XAUUSD', timeframe: '5', direction: 'BUY', strategy: 'B_CRT',
  entry: 4121.77, sl: 4112.59, tp1: 4130.95, tp2: 4140.13, tp3: 4149.31,
  quality: 90, timestamp: 1793886300000, eventTimestamp: 1793887500000, h1Trend: 'Bullish',
  status: 'CLOSED', executionModel: 'STRATEGY_EMULATOR', closeReason: 'TIME_EXIT',
  closedAt: 1793887200000, exitPrice: 4125.83, realizedNet: 6.7519998, realizedCurrency: 'USD',
};
afterEach(() => vi.unstubAllGlobals());

it('distinguishes closure time, observation time, planned levels and realized emulator result', () => {
  const message = formatMessage(validate(closed));
  for (const detail of ['ENTRY (planned): 4121.77', 'INITIAL SL: 4112.59', 'Closed: TIME_EXIT at 2026-11-05T14:00:00.000Z', 'Exit price (emulator): 4125.83', 'Realized net (emulator, after fees): 6.75 USD'])
    expect(message).toContain(detail);
  const gross = (4125.83 - 4121.79) * 2.1;
  const fees = (4125.83 + 4121.79) * 2.1 * 0.0001;
  expect(gross - fees).toBeCloseTo(closed.realizedNet, 8);
});

it('allows estimate closure reasons while rejecting claimed estimate realized fills or PnL', () => {
  const estimate = { ...closed, executionModel: 'INDICATOR_ESTIMATE', exitPrice: undefined, realizedNet: undefined, realizedCurrency: undefined };
  expect(formatMessage(validate(estimate))).not.toContain('Realized net');
  for (const actual of [{ exitPrice: 4125.83 }, { realizedNet: 1, realizedCurrency: 'USD' }])
    expect(() => validate({ ...estimate, ...actual })).toThrow('require strategy emulator');
});

it('rejects malformed, impossible or misplaced closure metadata', () => {
  for (const change of [
    { closedAt: undefined }, { closedAt: String(closed.closedAt) }, { closedAt: closed.timestamp - 1 },
    { closedAt: closed.eventTimestamp + 1 }, { closedAt: NaN }, { closeReason: 'GUARANTEED_WIN' },
    { closeReason: undefined }, { exitPrice: -1 }, { realizedNet: Infinity }, { realizedCurrency: '<USD>' },
    { realizedCurrency: undefined }, { realizedNet: undefined }, { eventType: 'BUY_SIGNAL', status: 'ENTRY_TRIGGERED' },
  ]) expect(() => validate({ ...closed, ...change })).toThrow();
});

it('delivers the closed-plan explanation through the existing mocked Telegram path', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{"ok":true}'));
  vi.stubGlobal('fetch', fetcher);
  await sendTelegram(validate(closed), 'synthetic-token', 'synthetic-chat');
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.chat_id).toBe('synthetic-chat');
  expect(body.text).toContain('TIME_EXIT');
  expect(body.text).toContain('6.75 USD');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
