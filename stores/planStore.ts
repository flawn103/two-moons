import { proxy, subscribe } from "valtio";
import { subscribeKey } from "valtio/utils";
import { db } from "@/utils/indexedDB";
import { message } from "antd";
import { schedulePlanReminder } from "@/utils/notification";

export type ModuleType =
  | "guitar.note"
  | "guitar.interval"
  | "sings.chord"
  | "sings.interval"
  | "sings.melody"
  | "sings.staff"
  | "sings.progression";

export interface ModuleGoal {
  type: ModuleType;
  questions: number;
  accuracy: number;
}

export interface PlanTemplate {
  id: string;
  name: string;
  modules: ModuleGoal[];
}

export interface PlanProgressItem {
  attempts: number;
  correct: number;
  completed: boolean;
  completedAt?: number;
}

export interface Plan {
  id: string;
  name: string;
  modules: ModuleGoal[];
  progress: Record<ModuleType, PlanProgressItem>;
}

export interface PlanState {
  templates: PlanTemplate[];
  plans: Plan[];
  currentPlanId: string | null;
  currentTemplateId: string | null;
  isInit: boolean;
  notificationEnabled: boolean;
  notificationTime: string; // "HH:mm"
}

const defaultTemplates: PlanTemplate[] = [
  {
    id: "new",
    name: "初学",
    modules: [
      { type: "sings.staff", questions: 10, accuracy: 80 },
      { type: "sings.interval", questions: 10, accuracy: 60 },
    ],
  },
  {
    id: "preset-guitar",
    name: "吉他",
    modules: [
      { type: "guitar.note", questions: 10, accuracy: 90 },
      { type: "guitar.interval", questions: 10, accuracy: 80 },
    ],
  },
  {
    id: "preset-sings",
    name: "视唱",
    modules: [
      { type: "sings.chord", questions: 10, accuracy: 80 },
      { type: "sings.interval", questions: 10, accuracy: 80 },
      { type: "sings.melody", questions: 5, accuracy: 60 },
      { type: "sings.staff", questions: 10, accuracy: 80 },
      { type: "sings.progression", questions: 10, accuracy: 70 },
    ],
  },
];

export const planStore = proxy<PlanState>({
  templates: [],
  plans: [],
  currentPlanId: null,
  currentTemplateId: null,
  isInit: false,
  notificationEnabled: false, // Default off
  notificationTime: "21:00", // Default 9 PM
});

const buildProgress = (
  modules: ModuleGoal[]
): Record<ModuleType, PlanProgressItem> => {
  const r: Record<ModuleType, PlanProgressItem> = {} as any;
  modules.forEach((m) => {
    r[m.type] = { attempts: 0, correct: 0, completed: false };
  });
  return r;
};

const savePlans = () => {
  db.setItem(
    "PRACTICE_PLANS",
    JSON.stringify(planStore.plans),
    "plan_data"
  ).catch(() => {});
};

export const planActions = {
  async init() {
    if (planStore.isInit) return;
    try {
      const t = await db.getItem("PRACTICE_PLAN_TEMPLATES");
      const p = await db.getItem("PRACTICE_PLANS");
      const c = await db.getItem("CURRENT_PLAN_ID");
      const ct = await db.getItem("CURRENT_PLAN_TEMPLATE_ID");
      const n = await db.getItem("PLAN_NOTIFICATION_ENABLED");
      const nt = await db.getItem("PLAN_NOTIFICATION_TIME");

      planStore.templates = t ? JSON.parse(t) : defaultTemplates;
      planStore.plans = p ? JSON.parse(p) : [];
      planStore.currentPlanId = c ? JSON.parse(c) : null;
      planStore.currentTemplateId = ct
        ? JSON.parse(ct)
        : planStore.templates[0]?.id || null;
      planStore.notificationEnabled = n ? JSON.parse(n) : false;
      planStore.notificationTime = nt ? JSON.parse(nt) : "21:00";
    } catch {
      planStore.templates = defaultTemplates;
      planStore.plans = [];
      planStore.currentPlanId = null;
      planStore.currentTemplateId = planStore.templates[0]?.id || null;
      planStore.notificationEnabled = false;
      planStore.notificationTime = "21:00";
    } finally {
      planStore.isInit = true;
      setupSubscriptions();
      setupNotificationSync();
    }
  },
  setNotificationEnabled(enabled: boolean) {
    planStore.notificationEnabled = enabled;
  },
  setNotificationTime(time: string) {
    planStore.notificationTime = time;
  },
  addTemplate(tpl: Omit<PlanTemplate, "id"> & { id?: string }) {
    const id = tpl.id ?? `tpl-${Date.now()}`;
    planStore.templates = [...planStore.templates, { ...tpl, id }];
  },
  updateTemplate(id: string, next: Partial<PlanTemplate>) {
    planStore.templates = planStore.templates.map((t) =>
      t.id === id ? { ...t, ...next } : t
    );
  },
  addModuleToTemplate(id: string, mod: ModuleGoal) {
    const tpl = planStore.templates.find((t) => t.id === id);
    if (!tpl) return;
    const modules = [...tpl.modules, { ...mod }];
    planActions.updateTemplate(id, { modules });
  },
  removeModuleFromTemplate(id: string, index: number) {
    const tpl = planStore.templates.find((t) => t.id === id);
    if (!tpl) return;
    const modules = tpl.modules.filter((_, i) => i !== index);
    planActions.updateTemplate(id, { modules });
  },
  removeTemplate(id: string) {
    planStore.templates = planStore.templates.filter((t) => t.id !== id);
    const nextPlans = planStore.plans.filter((p) => p.id !== id);
    planStore.plans = nextPlans;
    if (planStore.currentTemplateId === id) {
      planStore.currentTemplateId = planStore.templates[0]?.id || null;
    }
    if (planStore.currentPlanId === id) {
      const nextTpl = planStore.templates[0]?.id || null;
      if (nextTpl) {
        planActions.setCurrentTemplate(nextTpl);
      } else {
        planStore.currentPlanId = null;
      }
    }
    savePlans();
  },
  setCurrentPlan(id: string | null) {
    planStore.currentPlanId = id;
  },
  setSelectedTemplate(id: string | null) {
    planStore.currentTemplateId = id;
  },
  setCurrentTemplate(templateId: string | null) {
    if (!templateId) {
      planStore.currentPlanId = null;
      return;
    }
    const tpl = planStore.templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const plan: Plan = {
      id: templateId,
      name: tpl.name,
      modules: tpl.modules.map((m) => ({ ...m })),
      progress: buildProgress(tpl.modules),
    };
    planStore.plans = [plan];
    planStore.currentPlanId = templateId;
    savePlans();
  },
  recordProgress(module: ModuleType, attempts: number, correct: number) {
    if (!planStore.currentPlanId) return;
    const plan = planStore.plans.find((p) => p.id === planStore.currentPlanId);
    if (!plan) return;
    const goal = plan.modules.find((m) => m.type === module);
    if (!goal) return;
    const item = plan.progress[module] ?? {
      attempts: 0,
      correct: 0,
      completed: false,
    };
    item.attempts = attempts;
    item.correct = correct;
    const acc = (correct / (attempts || 1)) * 100;
    let isPreCompleted = item.completed;
    item.completed = attempts >= goal.questions && acc >= goal.accuracy;
    if (!isPreCompleted && item.completed) {
      item.completedAt = Date.now();
      message.success(`恭喜完成当前模块计划 🎉`);
    }

    plan.progress[module] = item;
    planStore.plans = planStore.plans.map((p) =>
      p.id === plan.id ? { ...plan } : p
    );

    if (isPreCompleted !== item.completed) {
      savePlans();
    }
  },
};

// Sync Logic

let subscriptionsSetup = false;
const setupSubscriptions = () => {
  if (subscriptionsSetup) return;
  if (typeof window === "undefined") return;
  subscriptionsSetup = true;

  // Persistence Subscriptions
  subscribeKey(planStore, "templates", () => {
    db.setItem(
      "PRACTICE_PLAN_TEMPLATES",
      JSON.stringify(planStore.templates),
      "plan_data"
    ).catch(() => {});
  });

  // subscribeKey(planStore, "plans", () => {
  //   db.setItem("PRACTICE_PLANS", JSON.stringify(planStore.plans)).catch(
  //     () => {}
  //   );
  // });

  subscribeKey(planStore, "currentPlanId", () => {
    db.setItem(
      "CURRENT_PLAN_ID",
      JSON.stringify(planStore.currentPlanId),
      "plan_data"
    ).catch(() => {});
  });

  subscribeKey(planStore, "currentTemplateId", () => {
    db.setItem(
      "CURRENT_PLAN_TEMPLATE_ID",
      JSON.stringify(planStore.currentTemplateId),
      "plan_data"
    ).catch(() => {});
  });

  subscribeKey(planStore, "notificationEnabled", () => {
    db.setItem(
      "PLAN_NOTIFICATION_ENABLED",
      JSON.stringify(planStore.notificationEnabled),
      "plan_data"
    ).catch(() => {});
  });

  subscribeKey(planStore, "notificationTime", () => {
    db.setItem(
      "PLAN_NOTIFICATION_TIME",
      JSON.stringify(planStore.notificationTime),
      "plan_data"
    ).catch(() => {});
  });
};

// Notification Logic
const updateNotificationStrategy = () => {
  if (!planStore.notificationEnabled) {
    schedulePlanReminder(null, planStore.notificationTime);
    return;
  }
  const plan = planStore.plans.find((p) => p.id === planStore.currentPlanId);
  schedulePlanReminder(plan || null, planStore.notificationTime);
};

let notificationSyncSetup = false;
const setupNotificationSync = () => {
  if (notificationSyncSetup) return;
  if (typeof window === "undefined") return;
  notificationSyncSetup = true;

  // Initial check
  updateNotificationStrategy();

  // Watch for changes
  subscribeKey(planStore, "plans", () => {
    updateNotificationStrategy();
  });

  subscribeKey(planStore, "currentPlanId", () => {
    updateNotificationStrategy();
  });

  subscribeKey(planStore, "notificationEnabled", () => {
    updateNotificationStrategy();
  });

  subscribeKey(planStore, "notificationTime", () => {
    updateNotificationStrategy();
  });
};
