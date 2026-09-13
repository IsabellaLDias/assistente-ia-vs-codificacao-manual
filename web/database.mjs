import { Pool } from 'pg';

const TRIAL_FIELDS = ['participant', 'kata', 'treatment'];

export function validateTrial(data) {
  if (!data || typeof data !== 'object') throw new Error('Envie os dados do trial.');
  for (const key of TRIAL_FIELDS) {
    if (typeof data[key] !== 'string' || !/^[\p{L}\p{N} _-]{1,60}$/u.test(data[key]) || !data[key].trim()) {
      throw new Error('Participante e kata devem ter até 60 letras, números, espaços, hífens ou sublinhados.');
    }
  }
  if (!['COM_IA', 'SEM_IA'].includes(data.treatment)) throw new Error('Selecione o tratamento.');
  if (!/^\d{2}:\d{2}$/.test(data.elapsedTime || '')) throw new Error('Informe um tempo válido.');
  const [minutes, seconds] = data.elapsedTime.split(':').map(Number);
  if (seconds > 59 || minutes > 35 || (minutes === 35 && seconds > 0)) throw new Error('O tempo do trial é inválido.');
  if (typeof data.startedAt !== 'string' || Number.isNaN(Date.parse(data.startedAt)) || typeof data.endedAt !== 'string' || Number.isNaN(Date.parse(data.endedAt))) throw new Error('As datas do trial são inválidas.');
  if (typeof data.notes !== 'string' || data.notes.length > 4000) throw new Error('As observações podem ter até 4.000 caracteres.');
  return {participant:data.participant.trim(), kata:data.kata.trim(), treatment:data.treatment, elapsedSeconds:minutes * 60 + seconds, elapsedTime:data.elapsedTime, startedAt:data.startedAt, endedAt:data.endedAt, timedOut:Boolean(data.timedOut), notes:data.notes.trim()};
}

export class LabDatabase {
  constructor(connectionString = process.env.LAB_DATABASE_URL ?? '') {
    this.enabled = Boolean(connectionString);
    this.pool = this.enabled ? new Pool({connectionString, max:3, idleTimeoutMillis:10000}) : null;
    this.ready = null;
  }

  async initialize() {
    if (!this.enabled) return false;
    if (!this.ready) this.ready = this.pool.query(`
      CREATE TABLE IF NOT EXISTS lab02_trial (
        id UUID PRIMARY KEY, participant VARCHAR(60) NOT NULL, kata VARCHAR(60) NOT NULL,
        treatment VARCHAR(10) NOT NULL CHECK (treatment IN ('COM_IA','SEM_IA')),
        started_at TIMESTAMPTZ NOT NULL, ended_at TIMESTAMPTZ NOT NULL,
        elapsed_seconds INTEGER NOT NULL CHECK (elapsed_seconds BETWEEN 0 AND 2100),
        timed_out BOOLEAN NOT NULL, notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS lab02_trial_created_at_idx ON lab02_trial (created_at DESC);
      CREATE TABLE IF NOT EXISTS lab02_analysis (
        id UUID PRIMARY KEY, participant VARCHAR(60) NOT NULL, kata VARCHAR(60) NOT NULL,
        treatment VARCHAR(10) NOT NULL CHECK (treatment IN ('COM_IA','SEM_IA')),
        metrics JSONB NOT NULL, methods JSONB NOT NULL, source_files JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS lab02_analysis_created_at_idx ON lab02_analysis (created_at DESC);
    `).then(() => true);
    return this.ready;
  }

  async saveTrial(id, input) {
    await this.initialize();
    const trial = validateTrial(input);
    const {rows} = await this.pool.query(
      `INSERT INTO lab02_trial (id, participant, kata, treatment, started_at, ended_at, elapsed_seconds, timed_out, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, participant, kata, treatment, started_at, ended_at, elapsed_seconds, timed_out, notes, created_at`,
      [id, trial.participant, trial.kata, trial.treatment, trial.startedAt, trial.endedAt, trial.elapsedSeconds, trial.timedOut, trial.notes]
    );
    return rows[0];
  }

  async listTrials() {
    await this.initialize();
    const {rows} = await this.pool.query(`SELECT id, participant, kata, treatment, started_at, ended_at, elapsed_seconds, timed_out, notes, created_at FROM lab02_trial ORDER BY created_at DESC LIMIT 500`);
    return rows;
  }

  async saveAnalysis(id, payload, result) {
    await this.initialize();
    await this.pool.query(
      `INSERT INTO lab02_analysis (id, participant, kata, treatment, metrics, methods, source_files)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb)`,
      [id, payload.participant, payload.kata, payload.treatment, JSON.stringify(result.metrics), JSON.stringify(result.methods), JSON.stringify(payload.files)]
    );
  }

  async close() { await this.pool?.end(); }
}
