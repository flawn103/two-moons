import { LocalNotifications } from "@capacitor/local-notifications";
import type { Plan } from "@/stores/planStore";

const PLAN_REMINDER_ID = 1001;
const CHANNEL_ID = "plan_reminder";

export const createNotificationChannel = async () => {
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: "练习提醒",
    description: "每日练习计划提醒",
    importance: 5,
    visibility: 1,
    vibration: true,
  });
};

export const isPlanCompleted = (plan: Plan): boolean => {
  return plan.modules.every((m) => {
    const progress = plan.progress[m.type];
    return progress && progress.completed;
  });
};

export const requestNotificationPermissions = async () => {
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display === "granted") return true;

  const req = await LocalNotifications.requestPermissions();
  return req.display === "granted";
};

export const schedulePlanReminder = async (
  plan: Plan | null,
  time: string = "21:00"
) => {
  // If no plan or plan is completed, cancel reminder
  if (!plan || isPlanCompleted(plan)) {
    await LocalNotifications.cancel({
      notifications: [{ id: PLAN_REMINDER_ID }],
    });
    return;
  }

  // Check permission - ONLY check, do not request automatically to avoid browser blocks on load
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") {
    // If not granted, we cannot schedule.
    // We assume permission is requested via UI interaction (requestNotificationPermissions)
    return;
  }

  // Parse time string "HH:mm"
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (isNaN(hour) || isNaN(minute)) return;

  await createNotificationChannel();

  await LocalNotifications.schedule({
    notifications: [
      {
        title: "练习提醒",
        body: "今天的计划还没有完成哦，快来练习吧！",
        id: PLAN_REMINDER_ID,
        channelId: CHANNEL_ID,
        schedule: {
          on: {
            hour,
            minute,
          },
          repeats: true,
          allowWhileIdle: false, // 关闭精确闹钟，以提高后台触发成功率
        },
        attachments: [],
        actionTypeId: "",
        extra: null,
      },
    ],
  });
};
