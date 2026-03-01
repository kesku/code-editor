use serde::Serialize;
use std::process::Command;

#[derive(Clone, Serialize)]
pub struct EngineStatus {
    pub installed: bool,
    pub running: bool,
    pub pid: Option<u32>,
    pub version: Option<String>,
    pub raw: String,
}

fn run_openclaw(args: &[&str]) -> Result<(String, String, bool), String> {
    // Use login shell to ensure PATH includes nvm, cargo, etc.
    let cmd_str = format!("openclaw {}", args.join(" "));
    let output = Command::new("sh")
        .args(["-lc", &cmd_str])
        .output()
        .map_err(|e| format!("Failed to run openclaw: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    Ok((stdout, stderr, output.status.success()))
}

#[tauri::command]
pub fn engine_status() -> Result<EngineStatus, String> {
    // Check if openclaw is installed
    let installed = Command::new("sh")
        .args(["-lc", "which openclaw"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !installed {
        return Ok(EngineStatus {
            installed: false,
            running: false,
            pid: None,
            version: None,
            raw: "openclaw not found in PATH".to_string(),
        });
    }

    // Get version
    let version = run_openclaw(&["--version"])
        .ok()
        .and_then(|(out, _, ok)| if ok { Some(out.trim().to_string()) } else { None });

    // Get gateway status
    let (stdout, stderr, success) = run_openclaw(&["gateway", "status"])?;
    let raw = if success { stdout.clone() } else { format!("{}{}", stdout, stderr) };

    // Parse running state — look for common indicators
    let combined = format!("{}{}", stdout.to_lowercase(), stderr.to_lowercase());
    let running = combined.contains("running") || combined.contains("pid")
        || (success && !combined.contains("not running") && !combined.contains("stopped"));

    // Try to extract PID
    let pid = raw.split_whitespace()
        .find_map(|word| word.trim_matches(|c: char| !c.is_ascii_digit()).parse::<u32>().ok())
        .filter(|&p| p > 100); // Filter out small numbers that aren't PIDs

    Ok(EngineStatus {
        installed,
        running,
        pid,
        version,
        raw: raw.trim().to_string(),
    })
}

#[tauri::command]
pub fn engine_start() -> Result<String, String> {
    let (stdout, stderr, success) = run_openclaw(&["gateway", "start"])?;
    if success {
        Ok(stdout.trim().to_string())
    } else {
        Err(format!("{}{}", stdout, stderr).trim().to_string())
    }
}

#[tauri::command]
pub fn engine_stop() -> Result<String, String> {
    let (stdout, stderr, success) = run_openclaw(&["gateway", "stop"])?;
    if success {
        Ok(stdout.trim().to_string())
    } else {
        Err(format!("{}{}", stdout, stderr).trim().to_string())
    }
}

#[tauri::command]
pub fn engine_restart() -> Result<String, String> {
    let (stdout, stderr, success) = run_openclaw(&["gateway", "restart"])?;
    if success {
        Ok(stdout.trim().to_string())
    } else {
        Err(format!("{}{}", stdout, stderr).trim().to_string())
    }
}


#[derive(Clone, Serialize)]
pub struct GatewayConfig {
    pub url: String,
    pub password: String,
}

#[tauri::command]
pub fn engine_gateway_config() -> Result<GatewayConfig, String> {
    // Read ~/.openclaw/openclaw.json for gateway port and password
    let home = std::env::var("HOME").unwrap_or_default();
    let config_path = std::path::PathBuf::from(&home).join(".openclaw/openclaw.json");

    if !config_path.exists() {
        return Err("Config not found".to_string());
    }

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    let config: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config: {}", e))?;

    // Extract port (default 18789) and password
    let port = config.get("port")
        .and_then(|v| v.as_u64())
        .unwrap_or(18789);

    let password = config.get("auth")
        .and_then(|a| a.get("password"))
        .and_then(|p| p.as_str())
        .unwrap_or("");

    Ok(GatewayConfig {
        url: format!("ws://127.0.0.1:{}", port),
        password: password.to_string(),
    })
}
