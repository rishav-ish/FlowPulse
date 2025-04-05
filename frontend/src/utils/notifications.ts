// This is a simple notifications utility to replace @mantine/notifications
// We'll create a simple API to mimic the one from @mantine/notifications

import { ReactNode } from "react";

interface NotificationProps {
  title?: string;
  message: string;
  color?: string;
  icon?: ReactNode;
  autoClose?: number | boolean;
}

// A simple in-memory notification system
class NotificationsManager {
  // This is a simple implementation that logs to console
  // In a real app, you'd use a state management system or context
  show(props: NotificationProps): string {
    const { title, message, color, icon } = props;
    console.log(`[Notification] ${title ? title + ': ' : ''}${message}`);
    return Math.random().toString(36).substring(2, 9); // Return a random ID
  }

  // Other methods like updateNotification, hideNotification could be added
}

export const notifications = new NotificationsManager(); 