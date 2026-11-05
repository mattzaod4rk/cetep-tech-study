import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Timer, Calendar, FileText, CheckSquare,
  BookOpen, Clock, Target, Zap, AlertTriangle,
  ChevronRight, Flame, Shield, CheckCircle2, GraduationCap,
  Megaphone, ExternalLink, Award, MessageSquare,
  Download, RefreshCw, Bell, CheckCheck, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import * as DataService from '../services/DataService.js';
import * as TeacherService from '../services/TeacherService.js';
import {
  formatDateBR, relativeDays, isWithinDays, isOverdue,
  formatMinutes, todayISO, parseLocalDate, SHORT_WEEKDAYS, WEEKDAYS
} from '../utils/dates.js';
import { getStudyHubTabForSubject } from '../utils/subjects.js';
import TaskModal from '../components/tasks/TaskModal.jsx';
import SummarizeModal from '../components/SummarizeModal.jsx';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const { gamification, completeTaskWithReward, refreshGamification, syncRevision } = useApp();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [classFeed, setClassFeed] = useState({
    enrolledClasses: [],
    contents: [],
    materials: [],
    activities: [],
    announcements: [],
    individualActivities: [],
    academicRecords: [],
    pedagogicalFeedbacks: [],
  });
  const [loading, setLoading] = useState(true);
  const [downloadingMaterialId, setDownloadingMaterialId] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSummarize, setShowSummarize] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      const raw = localStorage.getItem(`cetep_read_notifs_${user?.id || user?.uid}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const notifications = useMemo(() => {
    const list = [];

    // Comunicados da Turma
    (classFeed.announcements || []).forEach(ann => {
      list.push({
        id: `ann-${ann.id}`,
        type: 'announcement',
        priority: ann.priority || 'normal',
        author: ann.authorName || 'Professor',
        actionText: ann.priority === 'urgent'
          ? `publicou um comunicado URGENTE: "${ann.title}"`
          : `publicou o comunicado: "${ann.title}"`,
        title: ann.title,
        description: ann.message,
        createdAt: ann.createdAt,
        className: ann.className,
        badge: ann.priority === 'urgent' ? 'Urgente' : ann.priority === 'important' ? 'Importante' : 'Aviso',
        badgeBg: ann.priority === 'urgent' ? 'rgba(239, 68, 68, 0.15)' : ann.priority === 'important' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(37, 99, 235, 0.12)',
        badgeColor: ann.priority === 'urgent' ? 'var(--color-danger, #ef4444)' : ann.priority === 'important' ? 'var(--color-warning, #f59e0b)' : 'var(--color-primary, #2563eb)',
        targetId: `announcement-card-${ann.id}`,
      });
    });

    // Materiais & PDFs
    (classFeed.materials || []).forEach(mat => {
      list.push({
        id: `mat-${mat.id}`,
        type: 'material',
        author: mat.authorName || 'Professor',
        actionText: `subiu o material em PDF: "${mat.fileName || mat.title}"`,
        title: mat.title,
        description: mat.description || `Disciplina: ${mat.subject}`,
        createdAt: mat.createdAt,
        className: mat.className,
        subject: mat.subject,
        badge: 'Material / PDF',
        badgeBg: 'rgba(239, 68, 68, 0.12)',
        badgeColor: 'var(--color-danger, #ef4444)',
        targetId: `material-card-${mat.id}`,
        item: mat,
      });
    });

    // Conteúdos da Turma
    (classFeed.contents || []).forEach(cnt => {
      list.push({
        id: `cnt-${cnt.id}`,
        type: 'content',
        author: cnt.authorName || 'Professor',
        actionText: `subiu o conteúdo: "${cnt.title}" (${cnt.subject})`,
        title: cnt.title,
        description: cnt.description,
        createdAt: cnt.createdAt,
        className: cnt.className,
        subject: cnt.subject,
        badge: 'Conteúdo',
        badgeBg: 'rgba(37, 99, 235, 0.12)',
        badgeColor: 'var(--color-primary, #2563eb)',
        targetId: `content-card-${cnt.id}`,
      });
    });

    // Atividades da Turma
    (classFeed.activities || []).forEach(act => {
      list.push({
        id: `act-${act.id}`,
        type: 'activity',
        author: act.authorName || 'Professor',
        actionText: `publicou a atividade: "${act.title}" (${act.subject})`,
        title: act.title,
        description: act.description || (act.dueDate ? `Prazo de entrega: ${act.dueDate}` : ''),
        createdAt: act.createdAt,
        className: act.className,
        subject: act.subject,
        badge: 'Atividade',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeColor: 'var(--color-warning, #f59e0b)',
        targetId: `activity-card-${act.id}`,
      });
    });

    // Atividades Individuais
    (classFeed.individualActivities || []).forEach(ind => {
      list.push({
        id: `ind-${ind.id}`,
        type: 'individual_activity',
        author: ind.authorName || 'Professor',
        actionText: `atribuiu uma atividade individual para você: "${ind.title}"`,
        title: ind.title,
        description: ind.description,
        createdAt: ind.createdAt,
        badge: 'Individual',
        badgeBg: 'rgba(168, 85, 247, 0.15)',
        badgeColor: '#a855f7',
        targetId: `ind-act-card-${ind.id}`,
      });
    });

    // Avaliações & Notas
    (classFeed.academicRecords || []).forEach(rec => {
      list.push({
        id: `grade-${rec.id}`,
        type: 'grade',
        author: rec.authorName || 'Professor',
        actionText: `lançou sua nota em ${rec.subject}: ${rec.score} / ${rec.maxScore || 10}`,
        title: `Nota: ${rec.title || rec.subject}`,
        description: rec.comment || `Unidade: ${rec.unit || 'I Unidade'}`,
        createdAt: rec.createdAt,
        badge: 'Nota Lançada',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeColor: 'var(--color-success, #10b981)',
        targetId: `grade-card-${rec.id}`,
      });
    });

    // Feedbacks Pedagógicos
    (classFeed.pedagogicalFeedbacks || []).forEach(fb => {
      list.push({
        id: `fb-${fb.id}`,
        type: 'feedback',
        author: fb.authorName || 'Professor',
        actionText: `enviou um feedback pedagógico: "${fb.title}"`,
        title: fb.title,
        description: fb.comment,
        createdAt: fb.createdAt,
        badge: 'Feedback',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        badgeColor: 'var(--color-primary, #2563eb)',
        targetId: `feedback-card-${fb.id}`,
      });
    });

    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [classFeed]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readNotificationIds.includes(n.id)).length;
  }, [notifications, readNotificationIds]);

  const markAllNotificationsAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotificationIds(allIds);
    localStorage.setItem(`cetep_read_notifs_${user?.id || user?.uid}`, JSON.stringify(allIds));
    toast.success('Todas as notificações foram marcadas como lidas.');
  };

  const handleNotificationClick = (notif) => {
    if (!readNotificationIds.includes(notif.id)) {
      const next = [...readNotificationIds, notif.id];
      setReadNotificationIds(next);
      localStorage.setItem(`cetep_read_notifs_${user?.id || user?.uid}`, JSON.stringify(next));
    }
    setShowNotifications(false);

    const el = document.getElementById(notif.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'box-shadow 0.3s, transform 0.3s';
      el.style.boxShadow = '0 0 0 3px var(--color-primary)';
      el.style.transform = 'scale(1.01)';
      setTimeout(() => {
        el.style.boxShadow = '';
        el.style.transform = '';
      }, 2000);
    } else {
      const muralEl = document.getElementById('student-class-feed-section');
      if (muralEl) {
        muralEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const urgentAnnouncement = useMemo(() => {
    const anns = classFeed.announcements || [];
    return anns.find(a => a.priority === 'urgent') || anns.find(a => a.priority === 'important') || null;
  }, [classFeed.announcements]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = DataService.getTasks(user.id);
      const e = DataService.getAgendaEvents(user.id);
      const s = DataService.getWeeklyStats(user.id);
      const p = DataService.getWeeklyPlan(user.id);
      setTasks(t);
      setEvents(e);
      setStats(s);
      setWeeklyPlan(p);
      refreshGamification();

      const feed = await TeacherService.getStudentEnrolledClassesFeed(user).catch(() => ({
        enrolledClasses: [],
        contents: [],
        materials: [],
        activities: [],
        announcements: [],
        individualActivities: [],
        academicRecords: [],
        pedagogicalFeedbacks: [],
      }));
      setClassFeed(feed);
    } catch {
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [user, refreshGamification]);

  useEffect(() => { load(); }, [load, syncRevision]);

  const handleToggleIndividualActivity = async (activityId) => {
    try {
      await TeacherService.toggleStudentIndividualActivityStatus(user, activityId);
      toast.success('Status da atividade individual atualizado.');
      await load();
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar atividade.');
    }
  };

  const today = todayISO();
  const todayDayIndex = new Date().getDay();
  const todayPlan = weeklyPlan?.[todayDayIndex] || { subjects: [], goalMinutes: 0, note: '' };
  const todayMinutesStudied = stats?.dailyMinutes?.[6] || 0;

  const todayTasks = tasks.filter(t =>
    t.status === 'pending' && t.deadline && t.deadline === today
  );
  const upcomingTasks = tasks.filter(t =>
    t.status === 'pending' && t.deadline && isWithinDays(t.deadline, 7) && t.deadline !== today
  ).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 5);
  const overdueTasks = tasks.filter(t =>
    t.status === 'pending' && t.deadline && isOverdue(t.deadline)
  );
  const upcomingEvents = events.filter(e =>
    isWithinDays(e.date, 7)
  ).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const urgentEvents = events.filter(e => isWithinDays(e.date, 3));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user.name.split(' ')[0];

  const handleCompleteTask = async (taskId) => {
    const result = completeTaskWithReward(taskId);
    if (result.awarded) {
      toast.success(`Atividade concluída (+${result.points} XP).`);
      result.newAchievements?.forEach(a => {
        setTimeout(() => toast.success(`Conquista desbloqueada: ${a.title} (+${a.points} XP)`, { duration: 5000 }), 800);
      });
    } else {
      toast('Atividade já concluída anteriormente.');
    }
    load();
  };

  const handleTaskCreated = () => {
    load();
    setShowTaskModal(false);
  };

  const handleDownloadMaterial = async (item) => {
    setDownloadingMaterialId(item.id);
    try {
      const res = await TeacherService.downloadClassMaterial(user, item.classId, item.id);
      if (!res.base64 && !item.url) {
        toast.error('Nenhum dado de arquivo encontrado para este material.');
        return;
      }
      if (res.base64) {
        const byteCharacters = atob(res.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: item.fileType || 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = item.fileName || `${item.title}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        toast.success('Download do PDF iniciado!');
      } else if (item.url) {
        window.open(item.url, '_blank');
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao baixar material PDF.');
    } finally {
      setDownloadingMaterialId(null);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const streakDays = gamification?.streakDays || 0;
  const streakShields = gamification?.streakShields ?? 1;
  const weekStreak = gamification?.weekStreak || [];
  const studiedToday = gamification?.lastActiveDate === today;

  return (
    <div>
      {/* ─── Institutional Academic Header ──────── */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="academic-kicker">
            <GraduationCap size={14} />
            CETEP Recôncavo II Alberto Torres · Técnico em Informática
          </div>
          <h1>{greeting}, {firstName}</h1>
          <p style={{ textTransform: 'capitalize' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* ── Sino de Notificações da Turma ── */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowNotifications(prev => !prev)}
              id="notifications-bell-btn"
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7 }}
              title="Notificações e Avisos da Turma"
            >
              <Bell size={16} />
              <span>Notificações</span>
              {unreadCount > 0 && (
                <span style={{
                  background: 'var(--color-danger, #ef4444)',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: 12,
                  padding: '1px 6px',
                  minWidth: 18,
                  textAlign: 'center',
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Menu de Notificações */}
            {showNotifications && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                  onClick={() => setShowNotifications(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: 380,
                    maxWidth: '92vw',
                    maxHeight: 480,
                    overflowY: 'auto',
                    background: 'var(--color-bg-card)',
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
                    zIndex: 100,
                    padding: 14,
                  }}
                  id="notifications-dropdown-menu"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--color-border)', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.92rem' }}>
                      <Bell size={16} style={{ color: 'var(--color-primary)' }} />
                      Notificações da Turma
                      {unreadCount > 0 && (
                        <span className="badge badge-primary" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>
                          {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsAsRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary)',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: 0,
                        }}
                      >
                        <CheckCheck size={13} /> Marcar lidas
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>
                      Nenhuma notificação recente na sua turma.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {notifications.map(notif => {
                        const isUnread = !readNotificationIds.includes(notif.id);
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 8,
                              background: isUnread ? 'rgba(37, 99, 235, 0.06)' : 'var(--color-bg-subtle)',
                              border: isUnread ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid var(--color-border)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              position: 'relative',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: notif.badgeBg,
                                color: notif.badgeColor,
                              }}>
                                {notif.badge}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                  {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('pt-BR') : ''}
                                </span>
                                {isUnread && (
                                  <span style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    background: 'var(--color-primary, #2563eb)',
                                    display: 'inline-block',
                                  }} />
                                )}
                              </div>
                            </div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-text)', marginTop: 4 }}>
                              Prof. {notif.author} {notif.actionText}
                            </div>
                            {notif.description && (
                              <p style={{
                                fontSize: '0.78rem',
                                color: 'var(--color-text-secondary)',
                                margin: '4px 0 0',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {notif.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <button className="btn btn-secondary" onClick={() => setShowSummarize(true)} id="quick-summarize">
            <FileText size={16} /> Resumir texto
          </button>
          <button className="btn btn-primary" onClick={() => setShowTaskModal(true)} id="dashboard-new-task-btn">
            <Plus size={16} /> Nova atividade
          </button>
        </div>
      </div>

      {/* ─── Alerts ──────────────────────────────── */}
      {overdueTasks.length > 0 && (
        <div className="alert alert-danger" role="alert">
          <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>{overdueTasks.length} atividade{overdueTasks.length > 1 ? 's' : ''} com prazo vencido.</strong>{' '}
            Acesse <button onClick={() => navigate('/tasks')} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Atividades</button> para regularizar.
          </div>
        </div>
      )}
      {urgentEvents.length > 0 && (
        <div className="alert alert-warning" role="alert">
          <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Avaliações ou entregas nos próximos 3 dias:</strong>{' '}
            {urgentEvents.map(e => e.title).join(', ')}.
          </div>
        </div>
      )}

      {/* ─── Banner de Aviso Urgente em Destaque ──────────────── */}
      {urgentAnnouncement && (
        <div
          style={{
            marginBottom: 20,
            padding: '16px 20px',
            borderRadius: 12,
            background: urgentAnnouncement.priority === 'urgent'
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)'
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
            border: `2px solid ${urgentAnnouncement.priority === 'urgent' ? 'var(--color-danger, #ef4444)' : 'var(--color-warning, #f59e0b)'}`,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
          }}
          id="urgent-announcement-top-banner"
        >
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: urgentAnnouncement.priority === 'urgent' ? 'var(--color-danger, #ef4444)' : 'var(--color-warning, #f59e0b)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Megaphone size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: urgentAnnouncement.priority === 'urgent' ? 'var(--color-danger, #ef4444)' : 'var(--color-warning, #f59e0b)',
                  color: '#ffffff',
                }}>
                  {urgentAnnouncement.priority === 'urgent' ? '🚨 Aviso Urgente da Turma' : '⚠️ Comunicado Importante'}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  {urgentAnnouncement.className && `${urgentAnnouncement.className} · `}
                  Prof. {urgentAnnouncement.authorName} · {urgentAnnouncement.createdAt ? new Date(urgentAnnouncement.createdAt).toLocaleDateString('pt-BR') : ''}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const el = document.getElementById(`announcement-card-${urgentAnnouncement.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              >
                Ver no Mural <ChevronRight size={13} />
              </button>
            </div>
            <h3 style={{ fontSize: '1.05rem', margin: '6px 0 6px', color: 'var(--color-text)' }}>
              {urgentAnnouncement.title}
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {urgentAnnouncement.message}
            </p>
          </div>
        </div>
      )}

      {/* ─── Mural da Turma & Acompanhamento Docente (Conteúdos, Comunicados, Atividades e Notas) ─── */}
      <div className="card" style={{ marginTop: 22 }} id="student-class-feed-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <GraduationCap size={18} style={{ color: 'var(--color-primary)' }} />
              Mural da Turma & Publicações dos Professores
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
              {classFeed.enrolledClasses.length > 0
                ? `Turma(s) vinculada(s): ${classFeed.enrolledClasses.map(c => `${c.name} (${c.shift})`).join(' · ')}`
                : 'Assim que um professor vincular sua conta a uma turma, os comunicados, conteúdos e atividades da turma aparecerão aqui automaticamente.'}
            </p>
          </div>
          {classFeed.contents.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/math')}
            >
              <BookOpen size={14} /> Ver nos Cadernos de Estudo
            </button>
          )}
        </div>

        {classFeed.enrolledClasses.length === 0 &&
         classFeed.individualActivities.length === 0 &&
         classFeed.academicRecords.length === 0 &&
         classFeed.pedagogicalFeedbacks.length === 0 &&
         (!classFeed.materials || classFeed.materials.length === 0) ? (
          <div style={{
            padding: '20px 16px',
            borderRadius: 10,
            background: 'var(--color-bg-subtle)',
            border: '1px dashed var(--color-border)',
            fontSize: '0.85rem',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}>
            Nenhuma turma ou publicação docente vinculada à sua conta neste momento.
          </div>
        ) : (
          <div className="grid-2" style={{ gap: 18, alignItems: 'start' }}>
            {/* Coluna 1: Comunicados e Conteúdos Publicados na Turma */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h4 style={{ fontSize: '0.88rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Megaphone size={15} style={{ color: 'var(--color-primary)' }} />
                  Comunicados da Turma ({classFeed.announcements.length})
                </h4>
                {classFeed.announcements.length === 0 ? (
                  <div style={{ padding: '12px', borderRadius: 8, background: 'var(--color-bg-subtle)', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    Nenhum comunicado publicado para sua turma até o momento.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {classFeed.announcements.map(ann => (
                      <div
                        key={ann.id} id={`announcement-card-${ann.id}`}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 8,
                          background: 'var(--color-bg-input)',
                          border: '1px solid var(--color-border)',
                          borderLeft: `4px solid ${
                            ann.priority === 'urgent'
                              ? 'var(--color-danger)'
                              : ann.priority === 'important'
                              ? 'var(--color-warning)'
                              : 'var(--color-primary)'
                          }`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <strong style={{ fontSize: '0.88rem' }}>{ann.title}</strong>
                          <span className={`badge ${ann.priority === 'urgent' ? 'badge-danger' : ann.priority === 'important' ? 'badge-warning' : 'badge-primary'}`}>
                            {ann.priority === 'urgent' ? 'Urgente' : ann.priority === 'important' ? 'Importante' : 'Aviso'}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 6px', fontSize: '0.83rem', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                          {ann.message}
                        </p>
                        <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                          {ann.className && <span>{ann.className} · </span>}
                          Prof. {ann.authorName} · {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString('pt-BR') : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '0.88rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={15} style={{ color: 'var(--color-primary)' }} />
                  Conteúdos e Materiais dos Professores ({classFeed.contents.length})
                </h4>
                {classFeed.contents.length === 0 ? (
                  <div style={{ padding: '12px', borderRadius: 8, background: 'var(--color-bg-subtle)', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    Nenhum conteúdo publicado pelos professores da sua turma ainda.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {classFeed.contents.map(cnt => (
                      <div
                        key={cnt.id} id={`content-card-${cnt.id}`}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 8,
                          background: 'var(--color-bg-input)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                          <strong style={{ fontSize: '0.88rem' }}>{cnt.title}</strong>
                          <span className="chip">{cnt.subject}</span>
                        </div>
                        {cnt.description && (
                          <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                            {cnt.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                            {cnt.className && <span>{cnt.className} · </span>}
                            Prof. {cnt.authorName} · {cnt.createdAt ? new Date(cnt.createdAt).toLocaleDateString('pt-BR') : ''}
                          </span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {cnt.resourceUrl && (
                              <a
                                href={cnt.resourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                              >
                                <ExternalLink size={12} /> Abrir material / aula
                              </a>
                            )}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                              onClick={() => navigate(`/math?tab=${getStudyHubTabForSubject(cnt.subject)}`)}
                            >
                              Ver Caderno <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 style={{ fontSize: '0.88rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={15} style={{ color: 'var(--color-primary)' }} />
                  Arquivos PDFs & Apostilas da Turma ({classFeed.materials?.length || 0})
                </h4>
                {(!classFeed.materials || classFeed.materials.length === 0) ? (
                  <div style={{ padding: '12px', borderRadius: 8, background: 'var(--color-bg-subtle)', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    Nenhum arquivo PDF compartilhado pelos professores ainda.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {classFeed.materials.map(mat => (
                      <div
                        key={mat.id} id={`material-card-${mat.id}`}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 8,
                          background: 'var(--color-bg-input)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                          <strong style={{ fontSize: '0.88rem' }}>{mat.title}</strong>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span className="chip">{mat.subject}</span>
                            {mat.fileName && (
                              <span style={{
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                borderRadius: 5,
                                background: 'rgba(239, 68, 68, 0.12)',
                                color: 'var(--color-danger)',
                                fontWeight: 600,
                              }}>
                                PDF
                              </span>
                            )}
                          </div>
                        </div>
                        {mat.description && (
                          <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                            {mat.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                            {mat.className && <span>{mat.className} · </span>}
                            Prof. {mat.authorName} · {mat.createdAt ? new Date(mat.createdAt).toLocaleDateString('pt-BR') : ''}
                          </span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {(mat.totalChunks > 0 || mat.fileName) && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={downloadingMaterialId === mat.id}
                                onClick={() => handleDownloadMaterial(mat)}
                                style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                              >
                                {downloadingMaterialId === mat.id ? (
                                  <>
                                    <RefreshCw size={12} className="spin" /> Baixando...
                                  </>
                                ) : (
                                  <>
                                    <Download size={12} /> Baixar PDF
                                  </>
                                )}
                              </button>
                            )}
                            {mat.url && (
                              <a
                                href={mat.url}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                              >
                                <ExternalLink size={12} /> Abrir link
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 2: Atividades Publicadas (Turma e Individuais) + Notas e Feedbacks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h4 style={{ fontSize: '0.88rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={15} style={{ color: 'var(--color-primary)' }} />
                  Atividades da Turma e Individuais ({classFeed.activities.length + classFeed.individualActivities.length})
                </h4>
                {classFeed.activities.length === 0 && classFeed.individualActivities.length === 0 ? (
                  <div style={{ padding: '12px', borderRadius: 8, background: 'var(--color-bg-subtle)', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    Nenhuma atividade docente publicada para você neste momento.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {classFeed.individualActivities.map(ind => (
                      <div
                        key={ind.id} id={`ind-act-card-${ind.id}`}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: 'var(--color-bg-input)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.86rem', textDecoration: ind.status === 'completed' ? 'line-through' : 'none' }}>
                            [Individual] {ind.title}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)' }}>
                            {ind.subject} · Valor: {ind.points} pts {ind.dueDate ? `· Prazo: ${formatDateBR(ind.dueDate)}` : ''}
                          </div>
                          {ind.description && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                              {ind.description}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className={`btn btn-sm ${ind.status === 'completed' ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => handleToggleIndividualActivity(ind.id)}
                        >
                          {ind.status === 'completed' ? 'Concluída ✓' : 'Marcar concluída'}
                        </button>
                      </div>
                    ))}
                    {classFeed.activities.map(act => (
                      <div
                        key={act.id} id={`activity-card-${act.id}`}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: 'var(--color-bg-input)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: '0.86rem' }}>{act.title}</strong>
                          <span className="badge badge-primary">{act.type} · {act.points} pts</span>
                        </div>
                        {act.description && (
                          <p style={{ margin: '4px 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            {act.description}
                          </p>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                          {act.subject} {act.dueDate ? `· Entrega: ${formatDateBR(act.dueDate)}` : ''} · Prof. {act.authorName}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(classFeed.academicRecords.length > 0 || classFeed.pedagogicalFeedbacks.length > 0) && (
                <div>
                  <h4 style={{ fontSize: '0.88rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Award size={15} style={{ color: 'var(--color-primary)' }} />
                    Resultados de Avaliações & Feedbacks dos Professores
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {classFeed.academicRecords.map(rec => (
                      <div
                        key={rec.id} id={`grade-card-${rec.id}`}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: 'var(--color-bg-input)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            {rec.title} ({rec.unit})
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)' }}>
                            {rec.subject} · Prof. {rec.authorName}
                          </div>
                          {rec.notes && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                              {rec.notes}
                            </div>
                          )}
                        </div>
                        <span className="badge badge-success" style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                          Nota: {rec.score} / {rec.maxScore}
                        </span>
                      </div>
                    ))}
                    {classFeed.pedagogicalFeedbacks.map(fb => (
                      <div
                        key={fb.id} id={`feedback-card-${fb.id}`}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: 'var(--color-bg-subtle)',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.82rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 4 }}>
                          <MessageSquare size={13} /> Feedback em {fb.subject} (Prof. {fb.authorName})
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)' }}>{fb.comment}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>


      {/* ─── Top Academic Summary Row: Cronograma de Hoje + Constância Diária ── */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Card 1: Cronograma de Hoje (Matriz LDB + SUPROT/SEC-BA) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14, borderLeft: '4px solid var(--color-primary)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="badge badge-primary">
                Cronograma de Hoje · {WEEKDAYS[todayDayIndex]}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/agenda?tab=planner')}
                id="dashboard-edit-plan-btn"
              >
                Configurar grade <ChevronRight size={14} />
              </button>
            </div>
            <h3 style={{ fontSize: '1.05rem', marginBottom: 4 }}>
              {todayPlan.subjects?.length > 0
                ? todayPlan.subjects.join(' · ')
                : 'Horário livre para revisão'}
            </h3>
            {todayPlan.note && (
              <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                Foco sugerido: {todayPlan.note}
              </p>
            )}
          </div>

          {todayPlan.goalMinutes > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 5 }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Progresso da meta diária</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                  {todayMinutesStudied} / {todayPlan.goalMinutes} min
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(100, (todayMinutesStudied / todayPlan.goalMinutes) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {todayPlan.subjects?.length > 0 ? (
              <>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() =>
                    navigate(
                      `/focus?subject=${encodeURIComponent(todayPlan.subjects[0])}&minutes=${todayPlan.goalMinutes || 25}`
                    )
                  }
                >
                  <Timer size={14} /> Iniciar Sessão ({todayPlan.goalMinutes || 25} min)
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/math?tab=${getStudyHubTabForSubject(todayPlan.subjects[0])}`)}
                >
                  <BookOpen size={14} /> Abrir Caderno da Disciplina
                </button>
              </>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/math')}>
                <BookOpen size={14} /> Acessar Cadernos de Estudo
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Constância Diária (Sequência + Escudo AEE) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: studiedToday ? 'var(--color-warning-light)' : 'var(--color-bg-subtle)',
                  color: studiedToday ? 'var(--color-warning)' : 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Flame size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                  {streakDays} {streakDays === 1 ? 'dia consecutivo de estudo' : 'dias consecutivos de estudo'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  {studiedToday
                    ? 'Presença acadêmica de hoje registrada.'
                    : 'Conclua 1 atividade, exercício ou sessão de foco hoje para contabilizar.'}
                </div>
              </div>
            </div>

            <div
              className="badge badge-neutral"
              title="Proteção de Constância (AEE): preserva sua sequência automaticamente caso você se ausente por 1 dia."
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
            >
              <Shield size={12} style={{ color: 'var(--color-primary)' }} />
              <span>Proteção: {streakShields}/2</span>
            </div>
          </div>

          {/* Registro de frequência dos últimos 7 dias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, paddingTop: 2 }}>
            {weekStreak.map(dayItem => {
              const isDone = dayItem.status === 'active';
              const isShield = dayItem.status === 'shield';
              const isTodayPending = dayItem.status === 'today_pending';
              return (
                <div
                  key={dayItem.date}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 4px',
                    borderRadius: 6,
                    border: dayItem.isToday ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: isDone
                      ? 'var(--color-success-light)'
                      : isShield
                        ? 'var(--color-info-light)'
                        : isTodayPending
                          ? 'var(--color-primary-light)'
                          : 'var(--color-bg-input)',
                  }}
                  title={`${dayItem.dayShort} (${formatDateBR(dayItem.date)}): ${
                    isDone ? 'Estudo registrado' : isShield ? 'Dia protegido' : isTodayPending ? 'Hoje (pendente)' : 'Sem registro'
                  }`}
                >
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: dayItem.isToday ? 700 : 600,
                      color: dayItem.isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {dayItem.dayShort}
                  </span>
                  <div
                    style={{
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: isDone
                        ? 'var(--color-success)'
                        : isShield
                          ? 'var(--color-info)'
                          : 'var(--color-text-muted)',
                    }}
                  >
                    {isDone ? <CheckCircle2 size={15} /> : isShield ? <Shield size={14} /> : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Indicadores Semanais (4 caixas métricas sóbrias) ─── */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          {
            icon: <Clock size={17} />,
            label: 'Carga horária na semana',
            value: formatMinutes(stats?.totalMinutesThisWeek || 0),
            sub: 'Tempo dedicado em sessões',
          },
          {
            icon: <Target size={17} />,
            label: 'Atividades concluídas',
            value: stats?.completedThisWeek || 0,
            sub: 'Entregas nos últimos 7 dias',
          },
          {
            icon: <Timer size={17} />,
            label: 'Ciclos de foco',
            value: stats?.focusSessionsThisWeek || 0,
            sub: 'Sessões validadas (mín. 5m)',
          },
          {
            icon: <Zap size={17} />,
            label: 'Pontuação acumulada',
            value: `${gamification?.points || 0} XP`,
            sub: `Nível ${gamification?.levelInfo?.level || 1} · ${gamification?.levelInfo?.title || 'Iniciante'}`,
          },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="stat-label">{s.label}</span>
              <div className="stat-card-icon">
                {s.icon}
              </div>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ─── Acesso Rápido aos Módulos da Plataforma ─────────── */}
      <div style={{ marginBottom: 26 }}>
        <div className="section-header">
          <h3 className="section-title">Acesso Rápido</h3>
        </div>
        <div className="grid-4">
          {[
            { label: 'Cadernos de Estudo', desc: 'Matemática (LDB) e Informática (SUPROT)', icon: <BookOpen size={18} />, action: () => navigate('/math'), id: 'quick-math' },
            { label: 'Horário Semanal', desc: 'Planejamento por disciplina CETEP', icon: <Calendar size={18} />, action: () => navigate('/agenda?tab=planner'), id: 'quick-agenda' },
            { label: 'Sessão de Foco', desc: 'Cronômetro guiado por matéria', icon: <Timer size={18} />, action: () => navigate('/focus'), id: 'quick-focus' },
            { label: 'Nova Atividade', desc: 'Registrar exercício ou trabalho', icon: <Plus size={18} />, action: () => setShowTaskModal(true), id: 'quick-new-task' },
          ].map(btn => (
            <button
              key={btn.id}
              id={btn.id}
              className="card"
              onClick={btn.action}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div className="stat-card-icon" style={{ flexShrink: 0 }}>
                {btn.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text)' }}>{btn.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }} className="truncate">{btn.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Atividades de Hoje + Avaliações e Eventos ────────── */}
      <div className="grid-2">
        {/* Coluna 1: Atividades */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
              Atividades com entrega hoje
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>
              Ver todas <ChevronRight size={14} />
            </button>
          </div>

          {todayTasks.length === 0 ? (
            <div style={{ padding: '20px 12px', textAlign: 'center', background: 'var(--color-bg-subtle)', borderRadius: 8 }}>
              <p className="text-secondary" style={{ fontSize: '0.86rem' }}>
                Nenhuma atividade pendente com prazo para hoje.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayTasks.map(task => (
                <div key={task.id} className="task-item">
                  <div className={`task-left-bar priority-bar-${task.priority}`} />
                  <div style={{ paddingLeft: 4 }}>
                    <button
                      className="checkbox-wrapper"
                      onClick={() => handleCompleteTask(task.id)}
                      style={{ marginRight: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      aria-label={`Concluir atividade: ${task.title}`}
                    >
                      <div className="checkbox-custom" />
                    </button>
                  </div>
                  <div className="task-content">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      {task.subject && <span className="chip">{task.subject}</span>}
                      <span className={`badge badge-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'success'}`}>
                        Prioridade {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {upcomingTasks.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                Próximas entregas (7 dias)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {upcomingTasks.map(t => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--color-bg-subtle)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: '0.86rem' }}>{t.title}</span>
                    <span style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)' }}>{relativeDays(t.deadline)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna 2: Próximos Eventos + Frequência Semanal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">
                <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
                Próximas avaliações e eventos
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/agenda')}>
                Abrir agenda <ChevronRight size={14} />
              </button>
            </div>

            {upcomingEvents.length === 0 ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', background: 'var(--color-bg-subtle)', borderRadius: 8 }}>
                <p className="text-secondary" style={{ fontSize: '0.86rem' }}>
                  Nenhuma avaliação ou evento agendado para os próximos 7 dias.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingEvents.map(ev => (
                  <div
                    key={ev.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 7,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-input)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{ev.title}</span>
                      <span className={`badge ${isWithinDays(ev.date, 2) ? 'badge-danger' : isWithinDays(ev.date, 5) ? 'badge-warning' : 'badge-neutral'}`}>
                        {relativeDays(ev.date)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {ev.subject && <span className="chip">{ev.subject}</span>}
                      <span className="chip">{ev.type}</span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>{formatDateBR(ev.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {stats && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}>
                  <Clock size={15} style={{ color: 'var(--color-primary)' }} /> Distribuição de estudo na semana
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Total: {formatMinutes(stats.totalMinutesThisWeek)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 44 }}>
                {stats.dailyMinutes.map((min, i) => {
                  const max = Math.max(...stats.dailyMinutes, 1);
                  const pct = (min / max) * 100;
                  const isToday = i === 6;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.max(pct, 6)}%`,
                          minHeight: 4,
                          background: isToday ? 'var(--color-primary)' : 'var(--color-primary-muted)',
                          borderRadius: '3px 3px 0 0',
                        }}
                        title={`${min} min`}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {stats.days.map((day, i) => (
                  <div
                    key={day}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: '0.7rem',
                      color: i === 6 ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      fontWeight: i === 6 ? 700 : 500,
                    }}
                  >
                    {SHORT_WEEKDAYS[parseLocalDate(day).getDay()]}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────── */}
      {showTaskModal && (
        <TaskModal onClose={() => setShowTaskModal(false)} onSave={handleTaskCreated} />
      )}
      {showSummarize && (
        <SummarizeModal onClose={() => setShowSummarize(false)} />
      )}
    </div>
  );
}
