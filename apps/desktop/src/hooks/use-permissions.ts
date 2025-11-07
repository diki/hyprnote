import { useMutation, useQuery } from "@tanstack/react-query";
import { message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { Command } from "@tauri-apps/plugin-shell";
import { openUrl } from "@tauri-apps/plugin-opener";

import { commands as permissionsCommands } from "@hypr/plugin-permissions";

export function usePermissions() {
  const micPermissionStatus = useQuery({
    queryKey: ["micPermission"],
    queryFn: () => permissionsCommands.checkMicrophonePermission(),
    refetchInterval: 1000,
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const systemAudioPermissionStatus = useQuery({
    queryKey: ["systemAudioPermission"],
    queryFn: () => permissionsCommands.checkSystemAudioPermission(),
    refetchInterval: 1000,
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const accessibilityPermissionStatus = useQuery({
    queryKey: ["accessibilityPermission"],
    queryFn: async () => {
      const result = await permissionsCommands.checkAccessibilityPermission();
      if (result.status === "error") {
        console.error("Accessibility permission check error:", result.error);
        throw new Error(result.error);
      }
      console.log("Accessibility permission status:", result.data);
      return result.data;
    },
    refetchInterval: 1000,
  });

  const micPermission = useMutation({
    mutationFn: () => permissionsCommands.requestMicrophonePermission(),
    onSuccess: () => {
      setTimeout(() => {
        micPermissionStatus.refetch();
      }, 1000);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const systemAudioPermission = useMutation({
    mutationFn: () => permissionsCommands.requestSystemAudioPermission(),
    onSuccess: () => {
      message("The app will now restart to apply the changes", {
        kind: "info",
        title: "System Audio Status Changed",
      });
      setTimeout(() => {
        relaunch();
      }, 2000);
    },
    onError: console.error,
  });

  const accessibilityPermission = useMutation({
    mutationFn: () => permissionsCommands.requestAccessibilityPermission(),
    onSuccess: () => {
      setTimeout(() => {
        accessibilityPermissionStatus.refetch();
      }, 1000);
    },
    onError: console.error,
  });

  const openMicrophoneSettings = async () => {
    await Command.create("exec-sh", [
      "-c",
      "open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'",
    ]).execute();
  };

  const openSystemAudioSettings = async () => {
    await Command.create("exec-sh", [
      "-c",
      "open 'x-apple.systempreferences:com.apple.preference.security?Privacy_AudioCapture'",
    ]).execute();
  };

  const openAccessibilitySettings = async () => {
    try {
      // Use the system preferences URL scheme
      const url = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
      await openUrl(url);
    } catch (error) {
      console.error("Failed to open accessibility settings with URL scheme:", error);
      // Fallback: use shell command
      try {
        await Command.create("exec-sh", [
          "-c",
          "open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'",
        ]).execute();
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
    }
  };

  const handleMicPermissionAction = async () => {
    if (micPermissionStatus.data === "denied") {
      await openMicrophoneSettings();
    } else {
      micPermission.mutate();
    }
  };

  const handleSystemAudioPermissionAction = async () => {
    if (systemAudioPermissionStatus.data === "denied") {
      await openSystemAudioSettings();
    } else {
      systemAudioPermission.mutate(undefined);
    }
  };

  const handleAccessibilityPermissionAction = async () => {
    if (accessibilityPermissionStatus.data === "denied") {
      await openAccessibilitySettings();
    } else {
      accessibilityPermission.mutate(undefined);
    }
  };

  return {
    micPermissionStatus,
    systemAudioPermissionStatus,
    accessibilityPermissionStatus,
    micPermission,
    systemAudioPermission,
    accessibilityPermission,
    openMicrophoneSettings,
    openSystemAudioSettings,
    openAccessibilitySettings,
    handleMicPermissionAction,
    handleSystemAudioPermissionAction,
    handleAccessibilityPermissionAction,
  };
}
