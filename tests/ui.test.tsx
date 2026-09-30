import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { LOCAL_CASES } from '@/data';
import type { Attempt, CaseData, Step } from '@/lib/types';

const push = vi.fn();
const replace = vi.fn();
let currentId = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: currentId }),
}));

import { StoreProvider } from '@/lib/store';
import SimulationRunner from '@/components/sim/SimulationRunner';
import Dashboard from '@/app/dashboard/page';
import Stations from '@/app/stations/page';
import Performance from '@/app/performance/page';
import Profile from '@/app/profile/page';
import Landing from '@/app/page';
import ResultPage from '@/app/result/[id]/page';
import Auth from '@/app/auth/page';

const wrap = (ui: ReactNode) => render(<StoreProvider>{ui}</StoreProvider>);
const saved = (): Attempt[] => JSON.parse(window.localStorage.getItem('anes-osce-lab:v1') ?? '{"attempts":[]}').attempts;

let errors: unknown[][] = [];
beforeEach(() => {
  push.mockClear(); replace.mockClear(); errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a); });
});

async function answerStep(user: ReturnType<typeof userEvent.setup>, step: Step, good: boolean) {
  if (step.type === 'mcq' || step.type === 'branching') {
    const target = step.type === 'mcq'
      ? step.options.find((o) => (o.id === step.correct) === good)!
      : (good ? [...step.options].sort((a, b) => b.score - a.score)[0] : [...step.options].sort((a, b) => a.score - b.score)[0]);
    await user.click(screen.getByRole('radio', { name: new RegExp('^[A-D]' + target.text.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }));
  } else if (step.type === 'sequence') {
    if (good) {
      const want = step.items.map((i) => i.text);
      for (let target = 0; target < want.length; target++) {
        for (let guard = 0; guard < 20; guard++) {
          const rows = screen.getAllByRole('button', { name: /^Naik:/ }).map((b) => b.getAttribute('aria-label')!.replace('Naik: ', ''));
          // Row order = the "Move up" buttons list (first row has a disabled one but still rendered)
          const idx = rows.indexOf(want[target]);
          if (idx <= target) break;
          await user.click(screen.getByRole('button', { name: `Naik: ${want[target]}` }));
        }
      }
    }
  } else {
    const items = step.items.filter((i) => (good ? i.correct : !i.correct));
    for (const it of items) await user.click(screen.getByRole('button', { name: new RegExp(it.label.slice(0, 25).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }));
  }
}

async function playCase(c: CaseData, mode: 'practice' | 'exam', good: boolean) {
  const user = userEvent.setup();
  wrap(<SimulationRunner caseData={c} />);
  await screen.findByRole('heading', { name: 'Skenario' });
  expect(screen.getByRole('timer')).toHaveTextContent(String(c.durationMin).padStart(2, '0') + ':00');
  await user.click(screen.getByRole('radio', { name: new RegExp(mode === 'exam' ? 'MODE UJIAN' : 'MODE LATIHAN') }));
  await user.click(screen.getByRole('button', { name: /MULAI TIMER/ }));

  const queue = c.steps.filter((s) => !s.remedial);
  let guard = 0;
  let step: Step | undefined = queue[0];
  const seen: string[] = [];
  while (guard++ < 15) {
    const promptEl = await screen.findByRole('heading', { level: 2, name: (step as Step).prompt }, { timeout: 4000 });
    expect(promptEl).toBeInTheDocument();
    seen.push((step as Step).id);
    await answerStep(user, step as Step, good);
    await user.click(screen.getByRole('button', { name: mode === 'exam' ? /KONFIRMASI & LANJUT/ : /KONFIRMASI JAWABAN/ }));
    if (mode === 'practice') {
      expect(await screen.findByText('POIN KUNCI')).toBeInTheDocument();
      const last = replace.mock.calls.length;
      await user.click(screen.getByRole('button', { name: /LANJUT|SELESAIKAN STATION/ }));
      if (saved().length) break;
      void last;
    } else if (saved().length) break;
    // find next step: whichever prompt is now on screen
    await waitFor(() => {
      const h = screen.queryAllByRole('heading', { level: 2 }).map((e) => e.textContent);
      const cand = c.steps.find((s) => h.includes(s.prompt) && !seen.includes(s.id));
      if (!cand) throw new Error('waiting next step');
      step = cand;
    }, { timeout: 4000 });
  }
  await waitFor(() => expect(saved().length).toBe(1), { timeout: 4000 });
  return saved()[0];
}

describe('landing and static pages render without errors', () => {
  it('landing', () => { wrap(<Landing />); expect(screen.getAllByText('MULAI BERLATIH').length).toBe(2); expect(screen.getAllByText(/Hanya simulasi edukasi/).length).toBeGreaterThan(0); });
  it('dashboard empty state', async () => {
    wrap(<Dashboard />);
    expect(await screen.findByText(/Selamat datang kembali, Mahasiswa/)).toBeInTheDocument();
    expect(screen.getByText('Kasus Selesai')).toBeInTheDocument();
    expect(screen.getAllByText('INTRAOPERATIF').length).toBeGreaterThan(0);
    expect(screen.getByText('Segera hadir')).toBeInTheDocument();
  });
  it('stations lists every case', async () => {
    wrap(<Stations />);
    for (const c of LOCAL_CASES) expect(await screen.findByText(c.title)).toBeInTheDocument();
  });
  it('performance empty state', async () => { wrap(<Performance />); expect(await screen.findByText('Belum ada data')).toBeInTheDocument(); });
  it('profile', async () => { wrap(<Profile />); expect(await screen.findByText('Simpan profil')).toBeInTheDocument(); });
  it('auth (local mode)', async () => { wrap(<Auth />); expect(await screen.findByText('Sinkronisasi cloud belum dikonfigurasi')).toBeInTheDocument(); });
  it('result not found', async () => { currentId = 'nope'; wrap(<ResultPage />); expect(await screen.findByText('Hasil tidak ditemukan')).toBeInTheDocument(); });
  it('no console errors', () => { expect(errors).toEqual([]); });
});

describe('play every station through the real UI', () => {
  for (const c of LOCAL_CASES) {
    it(`${c.id}: practice, all correct`, async () => {
      const a = await playCase(c, 'practice', true);
      expect(a.mistakes).toBe(0);
      expect(a.final).toBeGreaterThanOrEqual(90);
      expect(a.mode).toBe('practice');
      expect(replace).toHaveBeenCalledWith(`/result/${a.id}`);
      expect(a.newBadges).toContain('FIRST_CASE');
    });
    it(`${c.id}: exam, all wrong, no feedback shown`, async () => {
      const a = await playCase(c, 'exam', false);
      expect(screen.queryByText('POIN KUNCI')).toBeNull();
      expect(a.mode).toBe('exam');
      expect(a.final).toBeLessThan(60);
      expect(a.mistakes).toBeGreaterThan(0);
    });
  }
});

describe('result page and review', () => {
  it('shows report, review mistakes, buttons', async () => {
    const a = await playCase(LOCAL_CASES[0], 'exam', false);
    cleanup();
    currentId = a.id;
    const user = userEvent.setup();
    wrap(<ResultPage />);
    expect(await screen.findByText(/STATION SELESAI/)).toBeInTheDocument();
    expect(screen.getByText('COBA LAGI')).toBeInTheDocument();
    expect(screen.getByText(/STATION BERIKUTNYA/)).toBeInTheDocument();
    expect(screen.getByText('KEMBALI KE DASHBOARD')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /TELAAH JAWABAN/ }));
    expect(await screen.findByText('Telaah jawaban')).toBeInTheDocument();
    expect(screen.getAllByText('Jawaban terbaik').length).toBeGreaterThan(0);
    await user.click(screen.getByLabelText(/Hanya telaah kesalahan/));
    expect(screen.getAllByText('Poin kunci').length).toBeGreaterThan(0);
  });
  it('dashboard and performance reflect a saved attempt', async () => {
    await playCase(LOCAL_CASES[1], 'practice', true);
    cleanup();
    wrap(<Performance />);
    expect(await screen.findByText('Tren skor')).toBeInTheDocument();
    cleanup();
    wrap(<Dashboard />);
    await screen.findByText(/Selamat datang kembali/);
    expect(screen.getByText('1/6')).toBeInTheDocument();
  });
  it('reset progress works', async () => {
    await playCase(LOCAL_CASES[2], 'practice', true);
    cleanup();
    const user = userEvent.setup();
    wrap(<Profile />);
    await user.click(await screen.findByRole('button', { name: 'Reset progres' }));
    const dlg = await screen.findByRole('dialog');
    await user.click(within(dlg).getByRole('button', { name: 'Ya, reset' }));
    await waitFor(() => expect(saved().length).toBe(0));
  });
});

describe('timer and exit', () => {
  it('exit asks for confirmation and does not save', async () => {
    const user = userEvent.setup();
    wrap(<SimulationRunner caseData={LOCAL_CASES[0]} />);
    await user.click(await screen.findByRole('button', { name: /MULAI TIMER/ }));
    await user.click(screen.getByRole('button', { name: 'Tinggalkan station' }));
    const dlg = await screen.findByRole('dialog');
    await user.click(within(dlg).getByRole('button', { name: 'Tinggalkan station' }));
    expect(push).toHaveBeenCalledWith('/stations');
    expect(saved().length).toBe(0);
  });
  it('exam times out and saves with timedOut', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const c = LOCAL_CASES[0];
    wrap(<SimulationRunner caseData={c} />);
    fireEvent.click(await screen.findByRole('radio', { name: /MODE UJIAN/ }));
    fireEvent.click(screen.getByRole('button', { name: /MULAI TIMER/ }));
    await vi.advanceTimersByTimeAsync(c.durationMin * 60_000 + 1500);
    await waitFor(() => expect(saved().length).toBe(1));
    expect(saved()[0].timedOut).toBe(true);
    expect(saved()[0].durationMs).toBe(c.durationMin * 60_000);
    vi.useRealTimers();
  });
});
