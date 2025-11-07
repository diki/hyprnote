use futures_util::StreamExt;

use crate::models::PermissionStatus;

#[cfg(target_os = "macos")]
use block2::StackBlock;
#[cfg(target_os = "macos")]
use objc2_av_foundation::{AVCaptureDevice, AVMediaTypeAudio};

#[tauri::command]
#[specta::specta]
pub async fn check_microphone_permission<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<PermissionStatus, String> {
    #[cfg(target_os = "macos")]
    {
        let status = unsafe {
            let media_type = AVMediaTypeAudio.unwrap();
            AVCaptureDevice::authorizationStatusForMediaType(media_type)
        };
        Ok(status.into())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let mut mic_sample_stream = hypr_audio::AudioInput::from_mic(None)
            .map_err(|e| e.to_string())?
            .stream();
        let sample = mic_sample_stream.next().await;
        Ok(if sample.is_some() {
            PermissionStatus::Authorized
        } else {
            PermissionStatus::Denied
        })
    }
}

#[tauri::command]
#[specta::specta]
pub async fn request_microphone_permission<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        unsafe {
            let media_type = AVMediaTypeAudio.unwrap();
            let block = StackBlock::new(|_granted| {});
            AVCaptureDevice::requestAccessForMediaType_completionHandler(media_type, &block);
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let mut mic_sample_stream = hypr_audio::AudioInput::from_mic(None)
            .map_err(|e| e.to_string())?
            .stream();
        mic_sample_stream.next().await;
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn check_system_audio_permission<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<PermissionStatus, String> {
    let status = hypr_tcc::audio_capture_permission_status();
    Ok(status.into())
}

#[tauri::command]
#[specta::specta]
pub async fn request_system_audio_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    {
        use tauri_plugin_shell::ShellExt;

        let bundle_id = app.config().identifier.clone();
        app.shell()
            .command("tccutil")
            .args(["reset", "AudioCapture", &bundle_id])
            .spawn()
            .ok();
    }

    let stop = hypr_audio::AudioOutput::silence();

    let mut speaker_sample_stream = hypr_audio::AudioInput::from_speaker().stream();
    speaker_sample_stream.next().await;

    let _ = stop.send(());
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn check_accessibility_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<PermissionStatus, String> {
    #[cfg(target_os = "macos")]
    {
        let bundle_id = app.config().identifier.clone();
        tracing::debug!("Checking accessibility permission for bundle: {}", bundle_id);
        
        // Use macos-accessibility-client as primary check (accessibility is not managed through TCC)
        let is_trusted = macos_accessibility_client::accessibility::application_is_trusted();
        tracing::debug!("Accessibility trusted status: {}", is_trusted);
        
        if is_trusted {
            return Ok(PermissionStatus::Authorized);
        }
        
        // Check TCC as fallback (though accessibility may not be in TCC)
        let tcc_status = hypr_tcc::accessibility_permission_status();
        tracing::debug!("Accessibility TCC status (fallback): {}", tcc_status);
        
        Ok(if tcc_status == hypr_tcc::GRANTED {
            PermissionStatus::Authorized
        } else if tcc_status == hypr_tcc::NEVER_ASKED {
            PermissionStatus::NeverRequested
        } else {
            PermissionStatus::Denied
        })
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(PermissionStatus::Denied)
    }
}

#[tauri::command]
#[specta::specta]
pub async fn request_accessibility_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let bundle_id = app.config().identifier.clone();
        tracing::debug!("Requesting accessibility permission for bundle: {}", bundle_id);
        macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
        tracing::debug!("Accessibility permission prompt shown");
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    #[cfg(target_os = "macos")]
    #[test]
    fn test_check_accessibility_permission_direct() {
        use macos_accessibility_client::accessibility;
        
        let is_trusted = accessibility::application_is_trusted();
        println!("\n=== Accessibility Permission Check ===");
        println!("macos-accessibility-client result: {}", is_trusted);
        
        if is_trusted {
            println!("✓ Permission is GRANTED - macos-accessibility-client detected it");
        } else {
            println!("✗ Permission is NOT granted - macos-accessibility-client returned false");
            println!("  Make sure the permission is enabled in System Settings > Privacy & Security > Accessibility");
            println!("  And that you've fully quit and restarted the app (Cmd+Q)");
        }
        println!("=====================================\n");
    }
}
