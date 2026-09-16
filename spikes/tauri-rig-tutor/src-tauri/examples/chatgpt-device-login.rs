use futures_util::StreamExt;
use rig_core::{
    client::CompletionClient,
    completion::{AssistantContent, CompletionModel},
    providers::chatgpt,
};
use std::path::PathBuf;

fn auth_file() -> Result<PathBuf, Box<dyn std::error::Error>> {
    std::env::var_os("GIC_TUTOR_AUTH_FILE")
        .map(PathBuf::from)
        .ok_or_else(|| "set GIC_TUTOR_AUTH_FILE to an app-owned, uncommitted auth.json path".into())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::var("GIC_ALLOW_LIVE").as_deref() != Ok("1") {
        return Err(
            "refusing device login: set GIC_ALLOW_LIVE=1 after explicit authorization".into(),
        );
    }
    let file = auth_file()?;
    if std::env::var("GIC_SIGN_OUT").as_deref() == Ok("1") {
        if file.exists() {
            std::fs::remove_file(file)?;
        }
        println!("ChatGPT sign-out complete.");
        return Ok(());
    }
    let client = chatgpt::Client::builder()
        .oauth()
        .auth_file(file)
        .on_device_code(|prompt| {
            eprintln!(
                "Open {} and enter device code {}.",
                prompt.verification_uri, prompt.user_code
            )
        })
        .allow_device_flow(true)
        .build()?;
    let model = client.completion_model(chatgpt::GPT_5_3_INSTANT);
    let mut response = model
        .stream(
            model
                .completion_request("Reply with exactly: GIC tutor spike.")
                .build(),
        )
        .await?;
    while let Some(chunk) = response.next().await {
        chunk?;
    }
    for item in response.choice {
        if let AssistantContent::Text(text) = item {
            print!("{}", text.text);
        }
    }
    println!();
    Ok(())
}
