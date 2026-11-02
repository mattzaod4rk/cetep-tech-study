/**
 * TeacherDashboard — Painel Docente e Administrativo Real (Cloud Firestore + RBAC)
 *
 * Perfis suportados:
 * - Professor (`role === 'professor'`): administra exclusivamente as turmas às quais foi autorizado (`uid in teacherIds`).
 * - Administrador (`role === 'admin'`): gerencia todas as turmas, aprova professores, controla perfis de usuários e emite convites individuais.
 * - Aluno (`role === 'aluno'`): bloqueado tanto na rota (`/teacher`) quanto nas regras de segurança do Cloud Firestore (`firestore.rules`).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  LogOut,
  GraduationCap,
  Users,
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  FileText,
  Megaphone,
  ShieldCheck,
  Plus,
  Trash2,
  ArrowLeft,
  UserPlus,
  UserMinus,
  ExternalLink,
  KeyRound,
  RefreshCw,
  FolderKanban,
  Search,
  X,
  Check,
  History,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import AccessibilityBar from '../../components/accessibility/AccessibilityBar.jsx';
import { SUBJECT_GROUPS } from '../../utils/subjects.js';
import * as TeacherService from '../../services/TeacherService.js';
import toast from 'react-hot-toast';

const ACTIVITY_TYPES = ['Atividade', 'Prova', 'Trabalho', 'Seminário', 'Projeto'];
const SHIFTS = ['Manhã', 'Tarde', 'Noite', 'Integral'];

function formatMin(m) {
  const num = Number(m) || 0;
  if (num < 60) return `${num}min`;
  return `${Math.floor(num / 60)}h ${num % 60 > 0 ? `${num % 60}min` : ''}`.trim();
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'professor' || user?.role === 'admin';

  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(
    initialTab === 'admin' && !isAdmin ? 'overview' : initialTab
  );

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentsMetrics, setStudentsMetrics] = useState([]);
  const [contents, setContents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [lastGeneratedCode, setLastGeneratedCode] = useState(null);

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingClassData, setLoadingClassData] = useState(false);
  const [sortBy, setSortBy] = useState('name');

  // Modal de Busca e Adição Segura de Estudantes (via Firebase Admin SDK)
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [searchedStudents, setSearchedStudents] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudentUids, setSelectedStudentUids] = useState([]);
  const [submittingEnrollment, setSubmittingEnrollment] = useState(false);

  // Formulários
  const [newClassForm, setNewClassForm] = useState({
    name: '',
    code: '',
    course: 'Técnico em Informática',
    shift: 'Manhã',
    year: '2026',
    description: '',
  });
  const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState('');

  const [contentForm, setContentForm] = useState({
    title: '',
    subject: 'Lógica de Programação',
    description: '',
    resourceUrl: '',
  });

  const [activityForm, setActivityForm] = useState({
    title: '',
    subject: 'Lógica de Programação',
    type: 'Atividade',
    dueDate: '',
    points: 10,
    description: '',
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    priority: 'normal',
  });

  const [inviteForm, setInviteForm] = useState({
    targetEmail: '',
    expiresInDays: 7,
  });

  const selectedClass = classes.find(c => c.id === selectedClassId) || null;

  const switchTab = (tabId) => {
    if (tabId === 'admin' && !isAdmin) return;
    setActiveTab(tabId);
    setSearchParams(tabId === 'overview' ? {} : { tab: tabId });
  };

  // Carrega turmas autorizadas e (apenas para Admin) lista de contas para gestão de perfis
  const loadInitialData = useCallback(async () => {
    if (!user || !isStaff) return;
    setLoadingClasses(true);
    try {
      const clsList = await TeacherService.getAuthorizedClasses(user);
      setClasses(clsList);

      if (clsList.length > 0) {
        setSelectedClassId(prev => (clsList.some(c => c.id === prev) ? prev : clsList[0].id));
      } else {
        setSelectedClassId('');
      }

      if (isAdmin) {
        const [usrList, invList] = await Promise.all([
          TeacherService.getAllRegisteredUsers(user).catch(() => []),
          TeacherService.getTeacherInvitesByAdmin(user).catch(() => []),
        ]);
        setAllUsers(usrList);
        setInvites(invList);
      } else {
        setAllUsers([]);
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar dados do painel docente.');
    } finally {
      setLoadingClasses(false);
    }
  }, [user, isStaff, isAdmin]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Carrega detalhes reais da turma selecionada (estudantes vinculados, conteúdos, atividades, comunicados e auditoria)
  const loadSelectedClassDetails = useCallback(async () => {
    if (!user || !selectedClass) {
      setStudentsMetrics([]);
      setContents([]);
      setActivities([]);
      setAnnouncements([]);
      setAuditLogs([]);
      return;
    }
    setLoadingClassData(true);
    try {
      const [metrics, cnts, acts, anns, logs] = await Promise.all([
        TeacherService.getClassStudentsAcademicProgress(user, selectedClass),
        TeacherService.getClassContents(user, selectedClass),
        TeacherService.getClassActivities(user, selectedClass),
        TeacherService.getClassAnnouncements(user, selectedClass),
        TeacherService.getClassAuditLogs(user, selectedClass.id).catch(() => []),
      ]);
      setStudentsMetrics(metrics);
      setContents(cnts);
      setActivities(acts);
      setAnnouncements(anns);
      setAuditLogs(logs);
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar dados da turma selecionada.');
    } finally {
      setLoadingClassData(false);
    }
  }, [user, selectedClass]);

  useEffect(() => {
    loadSelectedClassDetails();
  }, [loadSelectedClassDetails]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  // ── Handlers: Turmas e Busca/Matrícula Segura de Estudantes ─────────────
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassForm.name.trim()) {
      toast.error('Informe o nome da turma (ex: 2º INFO 1 - Matutino).');
      return;
    }
    try {
      const created = await TeacherService.createClass(user, {
        ...newClassForm,
        teacherIds: [user.uid || user.id],
        teacherNames: [user.name || 'Administrador'],
        studentIds: [],
        subjects: ['Matemática e suas Tecnologias', 'Lógica de Programação'],
      });
      toast.success(`Turma "${created.name}" criada com sucesso!`);
      setNewClassForm({
        name: '',
        code: '',
        course: 'Técnico em Informática',
        shift: 'Manhã',
        year: '2026',
        description: '',
      });
      await loadInitialData();
      setSelectedClassId(created.id);
    } catch (err) {
      toast.error(err.message || 'Erro ao criar turma.');
    }
  };

  const handleDeleteClass = async (classObj) => {
    try {
      await TeacherService.deleteClass(user, classObj.id);
      toast.success(`Turma "${classObj.name}" removida.`);
      await loadInitialData();
    } catch (err) {
      toast.error(err.message || 'Erro ao remover turma.');
    }
  };

  const runStudentSearch = useCallback(async (queryText = '') => {
    if (!user || !selectedClass) return;
    setSearchingStudents(true);
    try {
      const results = await TeacherService.searchStudentsForClass(user, selectedClass.id, queryText);
      setSearchedStudents(results);
    } catch (err) {
      toast.error(err.message || 'Erro ao pesquisar estudantes cadastrados.');
    } finally {
      setSearchingStudents(false);
    }
  }, [user, selectedClass]);

  const handleOpenAddStudentsModal = async () => {
    if (!selectedClass) {
      toast.error('Selecione uma turma atribuída primeiro.');
      return;
    }
    setStudentSearchQuery('');
    setSelectedStudentUids([]);
    setIsAddStudentModalOpen(true);
    await runStudentSearch('');
  };

  const handleSearchFormSubmit = async (e) => {
    e.preventDefault();
    await runStudentSearch(studentSearchQuery);
  };

  const handleToggleSelectStudent = (uid) => {
    setSelectedStudentUids(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleConfirmAddStudents = async () => {
    if (!selectedClass || selectedStudentUids.length === 0) {
      toast.error('Selecione ao menos um estudante para adicionar à turma.');
      return;
    }
    setSubmittingEnrollment(true);
    try {
      const res = await TeacherService.addStudentsToClass(user, selectedClass.id, selectedStudentUids);
      const count = res.addedStudentIds?.length || selectedStudentUids.length;
      toast.success(
        count === 1
          ? '1 estudante adicionado à turma com sucesso!'
          : `${count} estudantes adicionados à turma com sucesso!`
      );
      setIsAddStudentModalOpen(false);
      setSelectedStudentUids([]);
      await loadInitialData();
      await loadSelectedClassDetails();
    } catch (err) {
      toast.error(err.message || 'Não foi possível adicionar os estudantes à turma.');
    } finally {
      setSubmittingEnrollment(false);
    }
  };

  const handleUnlinkStudent = async (studentUid) => {
    if (!selectedClass) return;
    try {
      await TeacherService.removeStudentFromClass(user, selectedClass.id, studentUid);
      toast.success('Estudante removido da turma e operação registrada.');
      await loadInitialData();
      await loadSelectedClassDetails();
    } catch (err) {
      toast.error(err.message || 'Não foi possível remover o estudante da turma.');
    }
  };

  const handleAddSubjectToClass = async () => {
    if (!selectedClass || !selectedSubjectToAdd) return;
    try {
      const nextSubjects = Array.from(new Set([...(selectedClass.subjects || []), selectedSubjectToAdd]));
      await TeacherService.updateClass(user, selectedClass.id, { subjects: nextSubjects });
      setSelectedSubjectToAdd('');
      toast.success('Disciplina adicionada à turma!');
      await loadInitialData();
    } catch (err) {
      toast.error(err.message || 'Erro ao adicionar disciplina.');
    }
  };

  const handleRemoveSubjectFromClass = async (subj) => {
    if (!selectedClass) return;
    try {
      const nextSubjects = (selectedClass.subjects || []).filter(s => s !== subj);
      await TeacherService.updateClass(user, selectedClass.id, { subjects: nextSubjects });
      toast.success('Disciplina removida da turma.');
      await loadInitialData();
    } catch (err) {
      toast.error(err.message || 'Erro ao remover disciplina.');
    }
  };

  // ── Handlers: Conteúdos, Atividades, Comunicados ──────
  const handleCreateContent = async (e) => {
    e.preventDefault();
    if (!selectedClass) return;
    try {
      await TeacherService.createClassContent(user, selectedClass, contentForm);
      setContentForm(f => ({ ...f, title: '', description: '', resourceUrl: '' }));
      toast.success('Conteúdo publicado na turma!');
      await loadSelectedClassDetails();
    } catch (err) {
      toast.error(err.message || 'Erro ao publicar conteúdo.');
    }
  };

  const handleDeleteContent = async (contentId) => {
    if (!selectedClass) return;
    try {
      await TeacherService.deleteClassContent(user, selectedClass, contentId);
      toast.success('Conteúdo removido.');
      await loadSelectedClassDetails();
    } catch (err) {
      toast.error(err.message || 'Erro ao remover conteúdo.');
    }
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!selectedClass) return;
    try {
      await TeacherService.createClassActivity(user, selectedClass, activityForm);
      setActivityForm(f => ({ ...f, title: '', dueDate: '', description: '' }));
      toast.success('Atividade publicada para a turma!');
      await loadSelectedClassDetails();
    } catch (err) {
      toast.error(err.message || 'Erro ao publicar atividade.');
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!selectedClass) return;
    try {
      await TeacherService.deleteClassActivity(user, selectedClass, activityId);
      toast.success('Atividade removida.');
      await loadSelectedClassDetails();
    } catch (err) {
      toast.error(err.message || 'Erro ao remover atividade.');
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!selectedClass) return;
    try {
      await TeacherService.createClassAnnouncement(user, selectedClass, announcementForm);
      setAnnouncementForm({ title: '', message: '', priority: 'normal' });
      toast.success('Comunicado publicado!');
      await loadSelectedClassDetails();
    } catch (err) {
      toast.error(err.message || 'Erro ao publicar comunicado.');
    }
  };

  const handleDeleteAnnouncement = async (annId) => {
    if (!selectedClass) return;
    try {
      await TeacherService.deleteClassAnnouncement(user, selectedClass, annId);
      toast.success('Comunicado removido.');
      await loadSelectedClassDetails();
    } catch (err) {
      toast.error(err.message || 'Erro ao remover comunicado.');
    }
  };

  // ── Handlers: Administração (Perfis, Professores & Convites) ──
  const handleChangeUserRole = async (targetUser, newRole) => {
    try {
      await TeacherService.updateUserRoleByAdmin(user, targetUser.uid || targetUser.id, newRole);
      toast.success(`Perfil de ${targetUser.name} atualizado para "${newRole}"!`);
      await loadInitialData();
    } catch (err) {
      toast.error(err.message || 'Não foi possível alterar o perfil do usuário.');
    }
  };

  const handleToggleTeacherInClass = async (classObj, teacherUser) => {
    const tUid = teacherUser.uid || teacherUser.id;
    const currentIds = Array.isArray(classObj.teacherIds) ? classObj.teacherIds : [];
    const currentNames = Array.isArray(classObj.teacherNames) ? classObj.teacherNames : [];
    const isAssigned = currentIds.includes(tUid);

    const nextIds = isAssigned
      ? currentIds.filter(id => id !== tUid)
      : [...currentIds, tUid];
    const nextNames = isAssigned
      ? currentNames.filter(n => n !== teacherUser.name)
      : Array.from(new Set([...currentNames, teacherUser.name || teacherUser.email]));

    try {
      await TeacherService.updateClass(user, classObj.id, {
        teacherIds: nextIds,
        teacherNames: nextNames,
      });
      toast.success(
        isAssigned
          ? `Acesso de ${teacherUser.name} removido da turma ${classObj.name}.`
          : `Professor(a) ${teacherUser.name} autorizado(a) na turma ${classObj.name}!`
      );
      await loadInitialData();
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar vínculo do professor com a turma.');
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    try {
      const { plainCode } = await TeacherService.createTeacherInviteByAdmin(user, {
        targetEmail: inviteForm.targetEmail,
        assignedClassIds: selectedClassId ? [selectedClassId] : [],
        expiresInDays: inviteForm.expiresInDays,
      });
      setLastGeneratedCode({ email: inviteForm.targetEmail, code: plainCode });
      setInviteForm({ targetEmail: '', expiresInDays: 7 });
      toast.success('Convite individual gerado e registrado com hash SHA-256 no servidor!');
      await loadInitialData();
    } catch (err) {
      toast.error(err.message || 'Erro ao gerar convite.');
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    try {
      await TeacherService.revokeTeacherInviteByAdmin(user, inviteId);
      toast.success('Convite revogado.');
      await loadInitialData();
    } catch (err) {
      toast.error(err.message || 'Erro ao revogar convite.');
    }
  };

  // ── Métricas reais agregadas da turma selecionada ─────
  const totalTasks = studentsMetrics.reduce((a, s) => a + s.tasksCompleted + s.tasksPending, 0);
  const totalCompleted = studentsMetrics.reduce((a, s) => a + s.tasksCompleted, 0);
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
  const avgFocus = studentsMetrics.length > 0
    ? Math.round(studentsMetrics.reduce((a, s) => a + s.focusMinutes, 0) / studentsMetrics.length)
    : 0;
  const atRiskStudents = studentsMetrics.filter(s => {
    if (!s.lastActiveDate) return s.tasksPending > 0;
    const daysAgo = Math.floor((new Date() - new Date(s.lastActiveDate)) / 86400000);
    return daysAgo >= 3 || s.tasksPending >= 10;
  });

  const sortedStudents = [...studentsMetrics].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'tasks') return b.tasksCompleted - a.tasksCompleted;
    if (sortBy === 'focus') return b.focusMinutes - a.focusMinutes;
    if (sortBy === 'streak') return b.streakDays - a.streakDays;
    return 0;
  });

  const authorizedTeachers = allUsers.filter(
    u => u.role === 'professor' || u.role === 'admin'
  );

  const initials = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  const TABS = [
    { id: 'overview', label: 'Acompanhamento Acadêmico', icon: <TrendingUp size={16} /> },
    { id: 'classes', label: 'Minhas Turmas & Alunos', icon: <FolderKanban size={16} /> },
    { id: 'contents', label: `Conteúdos (${contents.length})`, icon: <BookOpen size={16} /> },
    { id: 'activities', label: `Atividades (${activities.length})`, icon: <FileText size={16} /> },
    { id: 'announcements', label: `Comunicados (${announcements.length})`, icon: <Megaphone size={16} /> },
    ...(isAdmin
      ? [{ id: 'admin', label: 'Administração & Permissões', icon: <ShieldCheck size={16} /> }]
      : []),
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* ─── Header Institucional ──────────────────────────────── */}
      <header style={{
        background: 'var(--color-sidebar-bg)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        height: 64,
        boxShadow: 'var(--shadow-sm)',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'var(--color-primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={20} color="white" />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>CETEP Tech Study</div>
            <div style={{ color: 'var(--color-sidebar-text)', fontSize: '0.72rem', opacity: 0.8 }}>
              {isAdmin ? 'Painel Docente & Administração Geral' : 'Painel Docente · AEE'}
            </div>
          </div>
        </div>

        <div style={{ marginLeft: 8 }}>
          <span style={{
            background: isAdmin ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.15)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: 20,
            letterSpacing: '0.04em',
          }}>
            {isAdmin ? 'PERFIL: ADMINISTRADOR' : 'PERFIL: PROFESSOR AUTORIZADO'}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/dashboard')}
            id="teacher-go-student-area-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={15} /> Área do Estudante
          </button>

          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>{user?.name}</div>
            <div style={{ color: 'var(--color-sidebar-text)', fontSize: '0.72rem', opacity: 0.75 }}>
              {user?.email}
            </div>
          </div>
          <div style={{ width: 36, height: 36, background: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>
            {initials}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            style={{ color: 'var(--color-sidebar-text)' }}
            id="teacher-logout-btn"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      {/* ─── Accessibility Bar ──────────────────────── */}
      <AccessibilityBar />

      <div style={{ padding: '28px', maxWidth: 1220, margin: '0 auto' }}>
        {/* ─── Seletor de Turma Ativa & Atualização ─── */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            marginBottom: 22,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
              Turma ativa:
            </span>
            {classes.length === 0 ? (
              <span style={{ fontSize: '0.86rem', color: 'var(--color-text-muted)' }}>
                Nenhuma turma vinculada no momento
              </span>
            ) : (
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: 260, fontWeight: 600 }}
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                id="teacher-class-select"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.shift} ({c.year}) — {(c.studentIds || []).length} estudante(s)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadInitialData}
              disabled={loadingClasses}
            >
              <RefreshCw size={14} /> Atualizar dados
            </button>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => switchTab('classes')}
              >
                <Plus size={14} /> Gerenciar / Criar Turma
              </button>
            )}
          </div>
        </div>

        {/* ─── Navegação por Abas do Painel Docente ──── */}
        <div style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 24,
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 12,
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              id={`teacher-tab-${tab.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 14px',
                borderRadius: 9,
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                border: activeTab === tab.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-bg-card)',
                color: activeTab === tab.id ? '#ffffff' : 'var(--color-text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            ABA 1: VISÃO GERAL & ACOMPANHAMENTO ACADÊMICO REAL
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <>
            {!selectedClass ? (
              <div className="card" style={{ textAlign: 'center', padding: '44px 24px' }}>
                <Users size={36} color="var(--color-primary)" style={{ margin: '0 auto 12px' }} />
                <h2 style={{ fontSize: '1.2rem', marginBottom: 6 }}>
                  Nenhuma turma cadastrada ou atribuída ao seu perfil
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', maxWidth: 540, margin: '0 auto 18px', fontSize: '0.9rem' }}>
                  {isAdmin
                    ? 'O painel docente agora trabalha exclusivamente com dados reais no Cloud Firestore. Crie sua primeira turma oficial do CETEP para vincular estudantes, publicar conteúdos e acompanhar o progresso real.'
                    : 'Você ainda não possui turmas vinculadas ao seu UID docente. Solicite ao Administrador do CETEP Tech Study a atribuição da sua turma.'}
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => switchTab('classes')}
                  >
                    <Plus size={16} /> Criar primeira turma oficial
                  </button>
                )}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 22 }}>
                  <h1 style={{ marginBottom: 4 }}>{selectedClass.name}</h1>
                  <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                    {selectedClass.course} · Turno {selectedClass.shift} · Ano letivo {selectedClass.year} ·{' '}
                    <strong>{studentsMetrics.length} estudante(s) vinculado(s)</strong>
                  </p>
                </div>

                {/* Summary Stats Reais */}
                <div className="grid-4" style={{ marginBottom: 24 }}>
                  {[
                    {
                      icon: <Users size={20} />,
                      label: 'Estudantes vinculados',
                      value: studentsMetrics.length,
                      sub: 'matriculados na turma',
                      color: 'hsl(220, 80%, 55%)',
                      bg: 'hsl(220, 80%, 95%)',
                    },
                    {
                      icon: <CheckSquare size={20} />,
                      label: 'Taxa de conclusão',
                      value: `${completionRate}%`,
                      sub: `${totalCompleted} de ${totalTasks} tarefas reais`,
                      color: 'hsl(142, 70%, 38%)',
                      bg: 'hsl(142, 60%, 92%)',
                    },
                    {
                      icon: <Clock size={20} />,
                      label: 'Foco médio por aluno',
                      value: formatMin(avgFocus),
                      sub: 'sessões reais validadas',
                      color: 'hsl(38, 90%, 45%)',
                      bg: 'hsl(38, 90%, 93%)',
                    },
                    {
                      icon: <AlertTriangle size={20} />,
                      label: 'Atenção pedagógica',
                      value: atRiskStudents.length,
                      sub: 'inativos há +3d ou acúmulo',
                      color: 'hsl(0, 75%, 50%)',
                      bg: 'hsl(0, 75%, 94%)',
                    },
                  ].map((s, i) => (
                    <div key={i} className="stat-card">
                      <div className="stat-card-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value">{s.value}</div>
                      <div className="stat-sub">{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Tabela Real de Estudantes Vinculados */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                    <h3>Acompanhamento individual dos estudantes</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Ordenar por:</span>
                      <select
                        className="form-select"
                        style={{ width: 'auto', fontSize: '0.85rem', padding: '6px 10px' }}
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        id="teacher-sort-select"
                      >
                        <option value="name">Nome</option>
                        <option value="tasks">Tarefas concluídas</option>
                        <option value="focus">Tempo de foco</option>
                        <option value="streak">Sequência</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleOpenAddStudentsModal}
                        id="overview-add-students-btn"
                      >
                        <UserPlus size={14} /> Adicionar estudantes
                      </button>
                    </div>
                  </div>

                  {loadingClassData ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      Carregando métricas reais dos estudantes no Cloud Firestore...
                    </div>
                  ) : sortedStudents.length === 0 ? (
                    <div style={{
                      padding: '28px 20px',
                      textAlign: 'center',
                      background: 'var(--color-bg-subtle)',
                      borderRadius: 10,
                      border: '1px dashed var(--color-border)',
                    }}>
                      <p style={{ fontWeight: 600, marginBottom: 6 }}>
                        Nenhum estudante vinculado a esta turma ainda.
                      </p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                        Não exibimos alunos fictícios. Clique em <strong>Adicionar estudantes</strong> para pesquisar por nome ou e-mail e matricular estudantes reais cadastrados na plataforma.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleOpenAddStudentsModal}
                      >
                        <UserPlus size={14} /> Adicionar estudantes
                      </button>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                            {['Estudante', 'E-mail', 'Concluídas', 'Pendentes', 'Foco Total', 'Sequência / XP', 'Última Atividade', 'Status'].map(h => (
                              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedStudents.map((s, i) => {
                            const total = s.tasksCompleted + s.tasksPending;
                            const pct = total > 0 ? Math.round((s.tasksCompleted / total) * 100) : 0;
                            const daysAgo = s.lastActiveDate
                              ? Math.floor((new Date() - new Date(s.lastActiveDate)) / 86400000)
                              : null;
                            const atRisk = (daysAgo !== null && daysAgo >= 3) || s.tasksPending >= 10;
                            return (
                              <tr key={s.uid} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-subtle)' }}>
                                <td style={{ padding: '12px', fontWeight: 600 }}>{s.name}</td>
                                <td style={{ padding: '12px', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{s.email}</td>
                                <td style={{ padding: '12px' }}>
                                  <span style={{ fontWeight: 600, marginRight: 6 }}>{s.tasksCompleted}</span>
                                  {total > 0 && (
                                    <span className={`badge ${pct >= 70 ? 'badge-success' : pct >= 40 ? 'badge-warning' : 'badge-danger'}`}>
                                      {pct}%
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '12px' }}>{s.tasksPending}</td>
                                <td style={{ padding: '12px' }}>{formatMin(s.focusMinutes)}</td>
                                <td style={{ padding: '12px' }}>
                                  🔥 {s.streakDays}d · <strong>{s.points} XP</strong>
                                </td>
                                <td style={{ padding: '12px', fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
                                  {daysAgo === null ? 'Sem registro' : daysAgo <= 0 ? 'Hoje' : daysAgo === 1 ? 'Ontem' : `Há ${daysAgo} dias`}
                                </td>
                                <td style={{ padding: '12px' }}>
                                  {atRisk ? (
                                    <span className="badge badge-danger">⚠ Atenção</span>
                                  ) : (
                                    <span className="badge badge-success">✓ Regular</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ABA 2: MINHAS TURMAS & ESTUDANTES VINCULADOS
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'classes' && (
          <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
            {/* Coluna Esquerda: Detalhes da Turma Atribuída, Lista de Estudantes e Botão "Adicionar estudantes" */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <h3 style={{ margin: 0 }}>
                  {selectedClass ? `Turma: ${selectedClass.name}` : 'Nenhuma turma selecionada'}
                </h3>
                {selectedClass && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenAddStudentsModal}
                    id="open-add-students-modal-btn"
                  >
                    <UserPlus size={15} /> Adicionar estudantes
                  </button>
                )}
              </div>

              {!selectedClass ? (
                <div style={{
                  padding: '24px 18px',
                  borderRadius: 10,
                  background: 'var(--color-bg-subtle)',
                  border: '1px dashed var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.9rem',
                }}>
                  {isAdmin
                    ? 'Use o formulário ao lado para criar uma turma oficial do CETEP.'
                    : 'Você ainda não possui turmas atribuídas pelo Administrador. Assim que uma turma for vinculada ao seu perfil docente, ela aparecerá aqui.'}
                </div>
              ) : (
                <>
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--color-bg-subtle)',
                    border: '1px solid var(--color-border)',
                    marginBottom: 18,
                    fontSize: '0.85rem',
                  }}>
                    <div><strong>Curso:</strong> {selectedClass.course}</div>
                    <div><strong>Turno / Ano:</strong> {selectedClass.shift} · {selectedClass.year}</div>
                    {selectedClass.code && <div><strong>Código:</strong> {selectedClass.code}</div>}
                    {selectedClass.description && <div style={{ marginTop: 4 }}>{selectedClass.description}</div>}
                  </div>

                  {/* Lista de Estudantes Vinculados */}
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                      <h4 style={{ fontSize: '0.92rem', margin: 0 }}>
                        Estudantes Vinculados ({studentsMetrics.length})
                      </h4>
                      <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                        Validação e matrícula via Firebase Admin SDK
                      </span>
                    </div>

                    {studentsMetrics.length === 0 ? (
                      <div style={{
                        padding: '18px 14px',
                        borderRadius: 8,
                        background: 'var(--color-bg-subtle)',
                        border: '1px dashed var(--color-border)',
                        fontSize: '0.84rem',
                        color: 'var(--color-text-secondary)',
                        textAlign: 'center',
                      }}>
                        Nenhum estudante vinculado a esta turma ainda. Clique em{' '}
                        <strong>"Adicionar estudantes"</strong> acima para pesquisar alunos por nome ou e-mail.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {studentsMetrics.map(st => (
                          <div
                            key={st.uid}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              borderRadius: 8,
                              background: 'var(--color-bg-input)',
                              border: '1px solid var(--color-border)',
                              fontSize: '0.85rem',
                              gap: 10,
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>{st.name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                {st.email} · {st.tasksCompleted} concluída(s) · {formatMin(st.focusMinutes)} foco
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleUnlinkStudent(st.uid)}
                              style={{ color: 'var(--color-danger)' }}
                            >
                              <UserMinus size={14} /> Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Disciplinas da Turma */}
                  <div style={{ marginBottom: 22 }}>
                    <h4 style={{ fontSize: '0.92rem', marginBottom: 8 }}>
                      Disciplinas da Turma ({(selectedClass.subjects || []).length})
                    </h4>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <select
                        className="form-select"
                        value={selectedSubjectToAdd}
                        onChange={e => setSelectedSubjectToAdd(e.target.value)}
                      >
                        <option value="">Adicionar disciplina da matriz CETEP...</option>
                        {SUBJECT_GROUPS.map(grp => (
                          <optgroup key={grp.id} label={grp.shortLabel}>
                            {grp.subjects.map(subj => (
                              <option key={subj} value={subj}>{subj}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleAddSubjectToClass}
                        disabled={!selectedSubjectToAdd}
                      >
                        <Plus size={14} /> Adicionar
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(selectedClass.subjects || []).map(subj => (
                        <span
                          key={subj}
                          className="chip"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px' }}
                        >
                          {subj}
                          <button
                            type="button"
                            onClick={() => handleRemoveSubjectFromClass(subj)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
                            aria-label={`Remover ${subj}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Registro de Operações e Autoria (Auditoria da Turma) */}
                  <div style={{ paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
                    <h4 style={{ fontSize: '0.88rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <History size={15} /> Registro de Operações e Autoria ({auditLogs.length})
                    </h4>
                    {auditLogs.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Nenhuma movimentação de matrícula registrada nesta turma até o momento.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 190, overflowY: 'auto' }}>
                        {auditLogs.slice(0, 10).map(log => (
                          <div
                            key={log.id}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: 'var(--color-bg-subtle)',
                              border: '1px solid var(--color-border)',
                              fontSize: '0.78rem',
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>
                              {log.action === 'ADD_STUDENTS'
                                ? `➕ Matrícula de ${(log.addedStudents || []).map(s => s.name).join(', ') || `${(log.addedStudentIds || []).length} aluno(s)`}`
                                : `➖ Remoção de ${log.removedStudentName || log.removedStudentId}`}
                            </div>
                            <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>
                              Autor: <strong>{log.actorName}</strong> ({log.actorRole}) ·{' '}
                              {log.createdAt ? new Date(log.createdAt).toLocaleString('pt-BR') : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteClass(selectedClass)}
                      >
                        <Trash2 size={14} /> Excluir turma "{selectedClass.name}"
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Coluna Direita: Minhas Turmas Atribuídas + Criação de Turmas (exclusivo Admin) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <h3 style={{ marginBottom: 10 }}>
                  {isAdmin ? `Todas as Turmas Cadastradas (${classes.length})` : `Minhas Turmas Atribuídas (${classes.length})`}
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                  {isAdmin
                    ? 'Como administrador, você visualiza e gerencia todas as turmas e matrículas do CETEP.'
                    : 'Você visualiza exclusivamente as turmas às quais seu perfil docente foi atribuído pelo administrador.'}
                </p>

                {classes.length === 0 ? (
                  <div style={{
                    padding: '18px 14px',
                    borderRadius: 8,
                    background: 'var(--color-bg-subtle)',
                    border: '1px dashed var(--color-border)',
                    fontSize: '0.84rem',
                    color: 'var(--color-text-muted)',
                    textAlign: 'center',
                  }}>
                    Nenhuma turma atribuída no momento.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {classes.map(cls => {
                      const isSelected = cls.id === selectedClassId;
                      return (
                        <div
                          key={cls.id}
                          onClick={() => setSelectedClassId(cls.id)}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                            background: isSelected ? 'var(--color-primary-light)' : 'var(--color-bg-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{cls.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                              {cls.course} · Turno {cls.shift} ({cls.year})
                            </div>
                          </div>
                          <span className="badge badge-primary">
                            {(cls.studentIds || []).length} aluno(s)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="card">
                  <h3 style={{ marginBottom: 14 }}>➕ Cadastrar Nova Turma Oficial (Admin)</h3>
                  <form onSubmit={handleCreateClass}>
                    <div className="form-group">
                      <label className="form-label">Nome da Turma *</label>
                      <input
                        className="form-input"
                        placeholder="Ex: 2º INFO 1 - Matutino"
                        value={newClassForm.name}
                        onChange={e => setNewClassForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Curso</label>
                        <input
                          className="form-input"
                          value={newClassForm.course}
                          onChange={e => setNewClassForm(f => ({ ...f, course: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Código / Sigla</label>
                        <input
                          className="form-input"
                          placeholder="Ex: INF-2M1"
                          value={newClassForm.code}
                          onChange={e => setNewClassForm(f => ({ ...f, code: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Turno</label>
                        <select
                          className="form-select"
                          value={newClassForm.shift}
                          onChange={e => setNewClassForm(f => ({ ...f, shift: e.target.value }))}
                        >
                          {SHIFTS.map(sh => <option key={sh} value={sh}>{sh}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ano Letivo</label>
                        <input
                          className="form-input"
                          value={newClassForm.year}
                          onChange={e => setNewClassForm(f => ({ ...f, year: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Observações Pedagógicas / AEE</label>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        placeholder="Descrição opcional da turma..."
                        value={newClassForm.description}
                        onChange={e => setNewClassForm(f => ({ ...f, description: e.target.value }))}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" id="teacher-create-class-btn">
                      <Plus size={16} /> Criar Turma no Cloud Firestore
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ABA 3: CADASTRO DE CONTEÚDOS POR DISCIPLINA
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'contents' && (
          !selectedClass ? (
            <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Selecione ou crie uma turma para gerenciar conteúdos por disciplina.
            </div>
          ) : (
            <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
              <div className="card">
                <h3 style={{ marginBottom: 14 }}>📚 Publicar Conteúdo ({selectedClass.name})</h3>
                <form onSubmit={handleCreateContent}>
                  <div className="form-group">
                    <label className="form-label">Título do Conteúdo *</label>
                    <input
                      className="form-input"
                      placeholder="Ex: Apostila Passo a Passo — Redes TCP/IP"
                      value={contentForm.title}
                      onChange={e => setContentForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Disciplina *</label>
                    <select
                      className="form-select"
                      value={contentForm.subject}
                      onChange={e => setContentForm(f => ({ ...f, subject: e.target.value }))}
                    >
                      {SUBJECT_GROUPS.map(grp => (
                        <optgroup key={grp.id} label={grp.shortLabel}>
                          {grp.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Resumo / Orientações de Estudo</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="Explicação objetiva para apoiar o estudo dos alunos..."
                      value={contentForm.description}
                      onChange={e => setContentForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Link de Material / Videoaula (opcional)</label>
                    <input
                      className="form-input"
                      placeholder="https://..."
                      value={contentForm.resourceUrl}
                      onChange={e => setContentForm(f => ({ ...f, resourceUrl: e.target.value }))}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <Plus size={16} /> Publicar Conteúdo
                  </button>
                </form>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: 14 }}>Conteúdos Publicados ({contents.length})</h3>
                {contents.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                    Nenhum conteúdo cadastrado para esta turma ainda.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {contents.map(item => (
                      <div
                        key={item.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-bg-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{item.title}</div>
                            <span className="chip" style={{ marginTop: 4, display: 'inline-block' }}>{item.subject}</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDeleteContent(item.id)}
                            style={{ color: 'var(--color-danger)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {item.description && (
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '8px 0 0' }}>
                            {item.description}
                          </p>
                        )}
                        {item.resourceUrl && (
                          <a
                            href={item.resourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: '0.82rem', color: 'var(--color-primary)', fontWeight: 600 }}
                          >
                            <ExternalLink size={13} /> Abrir material externo
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ABA 4: PUBLICAÇÃO DE ATIVIDADES E AVALIAÇÕES
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'activities' && (
          !selectedClass ? (
            <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Selecione ou crie uma turma para publicar atividades.
            </div>
          ) : (
            <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
              <div className="card">
                <h3 style={{ marginBottom: 14 }}>📝 Publicar Atividade ({selectedClass.name})</h3>
                <form onSubmit={handleCreateActivity}>
                  <div className="form-group">
                    <label className="form-label">Título da Atividade / Avaliação *</label>
                    <input
                      className="form-input"
                      placeholder="Ex: Lista Prática de Consultas SQL"
                      value={activityForm.title}
                      onChange={e => setActivityForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Tipo</label>
                      <select
                        className="form-select"
                        value={activityForm.type}
                        onChange={e => setActivityForm(f => ({ ...f, type: e.target.value }))}
                      >
                        {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Prazo de Entrega</label>
                      <input
                        type="date"
                        className="form-input"
                        value={activityForm.dueDate}
                        onChange={e => setActivityForm(f => ({ ...f, dueDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Disciplina *</label>
                      <select
                        className="form-select"
                        value={activityForm.subject}
                        onChange={e => setActivityForm(f => ({ ...f, subject: e.target.value }))}
                      >
                        {SUBJECT_GROUPS.map(grp => (
                          <optgroup key={grp.id} label={grp.shortLabel}>
                            {grp.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Pontuação / Peso</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="form-input"
                        value={activityForm.points}
                        onChange={e => setActivityForm(f => ({ ...f, points: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Instruções Passo a Passo (Inclusivo AEE)</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="Descreva os passos claros para realização da atividade..."
                      value={activityForm.description}
                      onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <Plus size={16} /> Publicar Atividade
                  </button>
                </form>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: 14 }}>Atividades da Turma ({activities.length})</h3>
                {activities.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                    Nenhuma atividade publicada para esta turma ainda.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {activities.map(act => (
                      <div
                        key={act.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-bg-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{act.title}</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                              <span className="chip">{act.type}</span>
                              <span className="chip">{act.subject}</span>
                              {act.dueDate && <span className="chip">Prazo: {act.dueDate}</span>}
                              <span className="chip">{act.points} pts</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDeleteActivity(act.id)}
                            style={{ color: 'var(--color-danger)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {act.description && (
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '8px 0 0' }}>
                            {act.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ABA 5: COMUNICADOS DA TURMA
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'announcements' && (
          !selectedClass ? (
            <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Selecione ou crie uma turma para enviar comunicados.
            </div>
          ) : (
            <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
              <div className="card">
                <h3 style={{ marginBottom: 14 }}>📢 Novo Comunicado ({selectedClass.name})</h3>
                <form onSubmit={handleCreateAnnouncement}>
                  <div className="form-group">
                    <label className="form-label">Assunto / Título *</label>
                    <input
                      className="form-input"
                      placeholder="Ex: Cronograma de Apresentações da Mostra AEE"
                      value={announcementForm.title}
                      onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prioridade</label>
                    <select
                      className="form-select"
                      value={announcementForm.priority}
                      onChange={e => setAnnouncementForm(f => ({ ...f, priority: e.target.value }))}
                    >
                      <option value="normal">Normal</option>
                      <option value="important">Importante</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mensagem *</label>
                    <textarea
                      className="form-textarea"
                      rows={4}
                      placeholder="Escreva o comunicado para os estudantes da turma..."
                      value={announcementForm.message}
                      onChange={e => setAnnouncementForm(f => ({ ...f, message: e.target.value }))}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <Plus size={16} /> Publicar Comunicado
                  </button>
                </form>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: 14 }}>Comunicados Enviados ({announcements.length})</h3>
                {announcements.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                    Nenhum comunicado publicado para esta turma ainda.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {announcements.map(ann => (
                      <div
                        key={ann.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-bg-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{ann.title}</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                              Por {ann.authorName} · Prioridade: {ann.priority}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            style={{ color: 'var(--color-danger)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
                          {ann.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ABA 6: ADMINISTRAÇÃO DE PERFIS, PROFESSORES & CONVITES (EXCLUSIVO ADMIN)
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'admin' && isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 1. Controle de Usuários e Aprovação de Professores */}
            <div className="card">
              <h3 style={{ marginBottom: 8 }}>🛡️ Controle de Perfis e Autorização de Professores</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: 18 }}>
                Todo cadastro público nasce como <strong>Aluno</strong>. Abaixo você pode promover uma conta existente para <strong>Professor</strong> (vinculando o UID do Firebase ao perfil docente) ou <strong>Administrador</strong>, protegido pelas Firestore Security Rules.
              </p>

              {allUsers.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>Nenhum usuário registrado encontrado.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                        {['Nome', 'E-mail', 'UID Firebase', 'Perfil Atual', 'Alterar Perfil'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map(u => {
                        const uid = u.uid || u.id;
                        const isSelf = uid === (user.uid || user.id);
                        return (
                          <tr key={uid} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{u.name}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <code style={{ fontSize: '0.76rem' }}>{uid}</code>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className={`badge ${u.role === 'admin' ? 'badge-primary' : u.role === 'professor' ? 'badge-success' : 'badge-warning'}`}>
                                {u.role === 'admin' ? 'Administrador' : u.role === 'professor' ? 'Professor' : 'Aluno'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <select
                                className="form-select"
                                style={{ width: 'auto', fontSize: '0.83rem', padding: '5px 10px' }}
                                value={u.role || 'aluno'}
                                disabled={isSelf}
                                onChange={e => handleChangeUserRole(u, e.target.value)}
                                id={`admin-role-select-${uid}`}
                              >
                                <option value="aluno">Aluno</option>
                                <option value="professor">Professor Autorizado</option>
                                <option value="admin">Administrador</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 2. Matriz de Autorização de Professores por Turma */}
            <div className="card">
              <h3 style={{ marginBottom: 8 }}>🏫 Atribuição de Turmas por Professor</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                Cada professor visualiza e administra <strong>somente</strong> as turmas às quais está vinculado abaixo.
              </p>

              {classes.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.86rem' }}>
                  Crie uma turma na aba "Minhas Turmas & Alunos" para atribuir professores a ela.
                </p>
              ) : authorizedTeachers.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.86rem' }}>
                  Promova um usuário para "Professor Autorizado" na tabela acima para vinculá-lo às turmas.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {classes.map(cls => (
                    <div
                      key={cls.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-subtle)',
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>
                        {cls.name} ({cls.shift} · {cls.year})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {authorizedTeachers.map(t => {
                          const tUid = t.uid || t.id;
                          const assigned = (cls.teacherIds || []).includes(tUid);
                          return (
                            <button
                              key={tUid}
                              type="button"
                              onClick={() => handleToggleTeacherInClass(cls, t)}
                              className={`btn btn-sm ${assigned ? 'btn-primary' : 'btn-secondary'}`}
                            >
                              {assigned ? '✓ ' : '+ '}
                              {t.name} ({t.role})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Sistema de Convites Individuais (Uso Único + Hash SHA-256 no Servidor) */}
            <div className="card">
              <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={18} color="var(--color-primary)" /> Convites Docentes Individuais (Uso Único & Validade)
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                Nenhum código universal fica no JavaScript. Cada convite é vinculado ao e-mail específico do docente, possui data de expiração e armazena apenas o <code>codeHash</code> (SHA-256) na coleção protegida <code>/teacherInvites</code> do Cloud Firestore.
              </p>

              <form onSubmit={handleCreateInvite} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 18 }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <label className="form-label">E-mail do Professor Convidado</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="docente@enova.educacao.ba.gov.br"
                    value={inviteForm.targetEmail}
                    onChange={e => setInviteForm(f => ({ ...f, targetEmail: e.target.value }))}
                  />
                </div>
                <div style={{ width: 150 }}>
                  <label className="form-label">Validade (dias)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    className="form-input"
                    value={inviteForm.expiresInDays}
                    onChange={e => setInviteForm(f => ({ ...f, expiresInDays: Number(e.target.value) }))}
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} /> Gerar Convite Individual
                </button>
              </form>

              {lastGeneratedCode && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'var(--color-primary-light)',
                  border: '1px solid var(--color-primary)',
                  marginBottom: 16,
                  fontSize: '0.86rem',
                }}>
                  <strong>Código de uso único gerado para {lastGeneratedCode.email}:</strong>{' '}
                  <code style={{ fontWeight: 800, fontSize: '0.95rem' }}>{lastGeneratedCode.code}</code>
                  <div style={{ fontSize: '0.78rem', marginTop: 4 }}>
                    Copie este código agora — por segurança, apenas o hash SHA-256 foi salvo no banco de dados.
                  </div>
                </div>
              )}

              {invites.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {invites.map(inv => (
                    <div
                      key={inv.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'var(--color-bg-subtle)',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.84rem',
                      }}
                    >
                      <div>
                        <strong>{inv.targetEmail}</strong> · <code>{inv.codePreview}</code> · Expira em:{' '}
                        {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleRevokeInvite(inv.id)}
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={14} /> Revogar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: BUSCAR E ADICIONAR ESTUDANTES À TURMA (VIA FIREBASE ADMIN SDK)
         ═══════════════════════════════════════════════════════════════════ */}
      {isAddStudentModalOpen && selectedClass && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setIsAddStudentModalOpen(false);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 640,
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '22px 24px',
              boxShadow: 'var(--shadow-lg)',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-students-modal-title"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div>
                <h3 id="add-students-modal-title" style={{ margin: '0 0 4px' }}>
                  Buscar e Adicionar Estudantes
                </h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                  Turma destino: <strong>{selectedClass.name}</strong> ({selectedClass.shift})
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsAddStudentModalOpen(false)}
                aria-label="Fechar janela"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border)',
                fontSize: '0.78rem',
                color: 'var(--color-text-secondary)',
                marginBottom: 14,
              }}
            >
              🔒 <strong>Privacidade & Proteção AEE:</strong> A pesquisa é executada no servidor via Firebase Admin SDK e retorna exclusivamente contas com perfil de estudante (exibindo apenas <strong>nome</strong> e <strong>e-mail</strong> de identificação). Preferências de acessibilidade e registros acadêmicos só ficam acessíveis após o vínculo com a turma.
            </div>

            {/* Campo de busca por nome ou e-mail */}
            <form onSubmit={handleSearchFormSubmit} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Pesquisar estudante por nome ou e-mail..."
                  value={studentSearchQuery}
                  onChange={e => {
                    const val = e.target.value;
                    setStudentSearchQuery(val);
                    runStudentSearch(val);
                  }}
                  id="student-search-input"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={searchingStudents}
              >
                {searchingStudents ? 'Buscando...' : 'Pesquisar'}
              </button>
            </form>

            {/* Lista de resultados (somente nome e e-mail) */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                minHeight: 220,
                maxHeight: 340,
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                padding: 10,
                background: 'var(--color-bg-subtle)',
                marginBottom: 16,
              }}
            >
              {searchingStudents ? (
                <div style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                  Consultando contas de estudantes no servidor seguro...
                </div>
              ) : searchedStudents.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.86rem' }}>
                  Nenhum estudante encontrado para "{studentSearchQuery}". Verifique se o aluno já criou sua conta na plataforma.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {searchedStudents.map(st => {
                    const isEnrolled = Boolean(st.alreadyEnrolled);
                    const isChecked = selectedStudentUids.includes(st.uid);
                    return (
                      <label
                        key={st.uid}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: isChecked ? 'var(--color-primary-light)' : 'var(--color-bg-card)',
                          border: isChecked ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                          cursor: isEnrolled ? 'not-allowed' : 'pointer',
                          opacity: isEnrolled ? 0.68 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={isEnrolled || isChecked}
                            disabled={isEnrolled}
                            onChange={() => !isEnrolled && handleToggleSelectStudent(st.uid)}
                            style={{ width: 16, height: 16 }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                              {st.name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                              {st.email}
                            </div>
                          </div>
                        </div>

                        {isEnrolled ? (
                          <span className="badge badge-success" style={{ fontSize: '0.73rem' }}>
                            <Check size={12} /> Já matriculado
                          </span>
                        ) : isChecked ? (
                          <span className="badge badge-primary" style={{ fontSize: '0.73rem' }}>
                            Selecionado
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                {selectedStudentUids.length} estudante(s) selecionado(s) para matrícula
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddStudentModalOpen(false)}
                  disabled={submittingEnrollment}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmAddStudents}
                  disabled={selectedStudentUids.length === 0 || submittingEnrollment}
                  id="confirm-add-students-btn"
                >
                  <UserPlus size={15} />{' '}
                  {submittingEnrollment
                    ? 'Matriculando...'
                    : `Adicionar à turma (${selectedStudentUids.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
