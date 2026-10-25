/**
 * MeetingForm — formulario de registro de nueva reunión.
 * Gestiona el estado local y lo persiste en MeetingContext al guardar.
 * No conecta APIs — eso corresponde a la pantalla Copiloto (Tarea 6).
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMeeting } from '../../context/MeetingContext';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import styles from './MeetingForm.module.css';

const INDUSTRIES = [
  'Salud', 'Manufactura', 'Fintech', 'Educación', 'Restaurantes', 'Seguros',
  'Servicios profesionales', 'Automotriz', 'Marketing', 'Comercio', 'Tecnología',
  'Logística', 'Construcción', 'Energía', 'Gobierno', 'Otro',
];

const MEETING_TYPES = [
  { value: 'presencial',    label: 'Presencial' },
  { value: 'videoconferencia', label: 'Videoconferencia' },
  { value: 'telefonica',    label: 'Telefónica' },
  { value: 'mixta',         label: 'Mixta' },
];

export default function MeetingForm({ initialData = null }) {
  const router = useRouter();
  const { startNewMeeting, setMeeting } = useMeeting();

  const [form, setForm] = useState({
    clientName:   initialData?.clientName   ?? '',
    company:      initialData?.company      ?? '',
    industry:     initialData?.industry     ?? '',
    city:         initialData?.city         ?? '',
    employees:    initialData?.employees    ?? '',
    meetingDate:  initialData?.meetingDate  ?? new Date().toISOString().slice(0, 10),
    meetingType:  initialData?.meetingType  ?? 'videoconferencia',
    notes:        initialData?.notes        ?? '',
  });

  const [errors, setErrors] = useState({});

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Limpiar error del campo al editar
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validar() {
    const errs = {};
    if (!form.company.trim())   errs.company   = 'El nombre de la empresa es obligatorio.';
    if (!form.industry.trim())  errs.industry  = 'Selecciona una industria.';
    if (!form.meetingDate)      errs.meetingDate = 'La fecha de la reunión es obligatoria.';
    if (form.employees && isNaN(Number(form.employees))) {
      errs.employees = 'Ingresa un número válido de empleados.';
    }
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validar();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    if (initialData?.id) {
      // Actualizar reunión existente (solo en /meeting?editar=1)
      setMeeting({ ...form, step: 'copilot' });
    } else {
      // Crear una reunión NUEVA con su propio registro; la anterior pasa al historial
      startNewMeeting({ ...form, step: 'copilot' });
    }

    router.push('/copilot');
  }

  function handleSaveDraft() {
    if (initialData?.id) {
      setMeeting({ ...form });
    } else {
      startNewMeeting({ ...form, step: 'meeting' });
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>

      {/* ── Sección: Datos del cliente ── */}
      <fieldset className={styles.section}>
        <legend className={styles.legend}>Datos del cliente</legend>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="clientName">
              Nombre del contacto
            </label>
            <input
              id="clientName"
              name="clientName"
              type="text"
              className={styles.input}
              value={form.clientName}
              onChange={handleChange}
              placeholder="Ej. Carlos García"
              autoComplete="name"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="company">
              Empresa <span className={styles.required}>*</span>
            </label>
            <input
              id="company"
              name="company"
              type="text"
              className={[styles.input, errors.company ? styles.inputError : ''].filter(Boolean).join(' ')}
              value={form.company}
              onChange={handleChange}
              placeholder="Ej. Aceros del Valle"
              autoComplete="organization"
            />
            {errors.company && <p className={styles.fieldError}>{errors.company}</p>}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="industry">
              Industria <span className={styles.required}>*</span>
            </label>
            <select
              id="industry"
              name="industry"
              className={[styles.input, styles.select, errors.industry ? styles.inputError : ''].filter(Boolean).join(' ')}
              value={form.industry}
              onChange={handleChange}
            >
              <option value="">Selecciona una industria…</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
            {errors.industry && <p className={styles.fieldError}>{errors.industry}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="city">
              Ciudad
            </label>
            <input
              id="city"
              name="city"
              type="text"
              className={styles.input}
              value={form.city}
              onChange={handleChange}
              placeholder="Ej. Monterrey"
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="employees">
              Número de empleados
            </label>
            <input
              id="employees"
              name="employees"
              type="number"
              min="1"
              className={[styles.input, errors.employees ? styles.inputError : ''].filter(Boolean).join(' ')}
              value={form.employees}
              onChange={handleChange}
              placeholder="Ej. 180"
            />
            {errors.employees && <p className={styles.fieldError}>{errors.employees}</p>}
          </div>
        </div>
      </fieldset>

      {/* ── Sección: Datos de la reunión ── */}
      <fieldset className={styles.section}>
        <legend className={styles.legend}>Datos de la reunión</legend>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="meetingDate">
              Fecha <span className={styles.required}>*</span>
            </label>
            <input
              id="meetingDate"
              name="meetingDate"
              type="date"
              className={[styles.input, errors.meetingDate ? styles.inputError : ''].filter(Boolean).join(' ')}
              value={form.meetingDate}
              onChange={handleChange}
            />
            {errors.meetingDate && <p className={styles.fieldError}>{errors.meetingDate}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="meetingType">
              Modalidad
            </label>
            <select
              id="meetingType"
              name="meetingType"
              className={[styles.input, styles.select].join(' ')}
              value={form.meetingType}
              onChange={handleChange}
            >
              {MEETING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="notes">
            Notas previas o mensaje inicial del cliente
          </label>
          <textarea
            id="notes"
            name="notes"
            className={[styles.input, styles.textarea].join(' ')}
            value={form.notes}
            onChange={handleChange}
            rows={4}
            placeholder="Escribe aquí cualquier información que el cliente compartió antes de la reunión…"
          />
          <p className={styles.hint}>
            Esta información se usará como contexto para el análisis con IA.
          </p>
        </div>
      </fieldset>

      {/* ── Disclaimer ── */}
      <div className={styles.disclaimer}>
        <Badge variant="warning">Datos simulados</Badge>
        <span>
          Esta aplicación es un prototipo académico del Hackathon Alestra.
          No ingreses información confidencial real de clientes.
        </span>
      </div>

      {/* ── Acciones ── */}
      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={handleSaveDraft}>
          Guardar borrador
        </Button>
        <Button type="submit" variant="primary">
          Guardar y continuar →
        </Button>
      </div>

    </form>
  );
}
