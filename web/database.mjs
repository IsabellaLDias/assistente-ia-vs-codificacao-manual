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
  const sourceFiles = validateTrialSourceFiles(data.sourceFiles ?? []);
  return {participant:data.participant.trim(), kata:data.kata.trim(), treatment:data.treatment, elapsedSeconds:minutes * 60 + seconds, elapsedTime:data.elapsedTime, startedAt:data.startedAt, endedAt:data.endedAt, timedOut:Boolean(data.timedOut), notes:data.notes.trim(), sourceFiles};
}

export function validateTrialSourceFiles(files) {
  if (!Array.isArray(files) || files.length > 20) throw new Error('Envie no máximo 20 anexos, contando o texto digitado.');
  const names = new Set(); let total = 0;
  return files.map(file => {
    if (!file || typeof file.name !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$-]*\.(?:java|txt)$/i.test(file.name)) throw new Error('Use arquivos .java ou .txt com nomes válidos, sem pastas.');
    if (names.has(file.name.toLowerCase())) throw new Error('Há nomes de arquivos repetidos.');
    names.add(file.name.toLowerCase());
    if (typeof file.content !== 'string' || !file.content.trim() || Buffer.byteLength(file.content) > 100000 || file.content.includes('\0')) throw new Error('Cada arquivo deve conter código UTF-8 e ter no máximo 100 KB.');
    total += Buffer.byteLength(file.content);
    if (total > 1024 * 1024) throw new Error('O envio excede 1 MB.');
    return {name:file.name, content:file.content};
  });
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
      ALTER TABLE lab02_trial ADD COLUMN IF NOT EXISTS source_files JSONB NOT NULL DEFAULT '[]'::jsonb;
      CREATE TABLE IF NOT EXISTS lab02_trial_revision (
        id UUID PRIMARY KEY, trial_id UUID NOT NULL REFERENCES lab02_trial(id),
        previous_value JSONB NOT NULL, revised_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS lab02_trial_revision_trial_id_idx ON lab02_trial_revision (trial_id, revised_at DESC);
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
      `INSERT INTO lab02_trial (id, participant, kata, treatment, started_at, ended_at, elapsed_seconds, timed_out, notes, source_files)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
       RETURNING id, participant, kata, treatment, started_at, ended_at, elapsed_seconds, timed_out, notes, source_files, created_at`,
      [id, trial.participant, trial.kata, trial.treatment, trial.startedAt, trial.endedAt, trial.elapsedSeconds, trial.timedOut, trial.notes, JSON.stringify(trial.sourceFiles)]
    );
    return rows[0];
  }

  async listTrials() {
    await this.initialize();
    const {rows} = await this.pool.query(`SELECT id, participant, kata, treatment, started_at, ended_at, elapsed_seconds, timed_out, notes, source_files, created_at FROM lab02_trial ORDER BY created_at DESC LIMIT 500`);
    return rows;
  }

  async updateTrial(id, input, revisionId) {
    await this.initialize();
    const trial = validateTrial(input);
    const {rows} = await this.pool.query(
      `WITH previous AS (SELECT to_jsonb(t) AS value FROM lab02_trial t WHERE id = $1),
       audit AS (INSERT INTO lab02_trial_revision (id, trial_id, previous_value) SELECT $10, $1, value FROM previous)
       UPDATE lab02_trial SET participant=$2, kata=$3, treatment=$4, started_at=$5, ended_at=$6,
       elapsed_seconds=$7, timed_out=$8, notes=$9 WHERE id=$1
       RETURNING id, participant, kata, treatment, started_at, ended_at, elapsed_seconds, timed_out, notes, source_files, created_at`,
      [id, trial.participant, trial.kata, trial.treatment, trial.startedAt, trial.endedAt, trial.elapsedSeconds, trial.timedOut, trial.notes, revisionId]
    );
    if (!rows[0]) throw new Error('Trial não encontrado.');
    return rows[0];
  }

  async deleteTrial(id) {
    await this.initialize();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query('SELECT id FROM lab02_trial WHERE id=$1 FOR UPDATE', [id]);
      if (!existing.rowCount) {
        await client.query('ROLLBACK');
        return false;
      }
      await client.query('DELETE FROM lab02_trial_revision WHERE trial_id=$1', [id]);
      await client.query('DELETE FROM lab02_trial WHERE id=$1', [id]);
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async getTrial(id) {
    await this.initialize();
    const {rows} = await this.pool.query(`SELECT id, participant, kata, treatment, started_at, ended_at, elapsed_seconds, timed_out, notes, source_files, created_at FROM lab02_trial WHERE id=$1`, [id]);
    return rows[0] ?? null;
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
