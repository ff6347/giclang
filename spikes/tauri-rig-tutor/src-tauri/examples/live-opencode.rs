use futures_util::StreamExt;
use rig_core::{
    client::CompletionClient,
    completion::{AssistantContent, CompletionModel},
    providers::openai,
};

const ZEN_BASE_URL: &str = "https://opencode.ai/zen/v1";
const CURATED_LOW_COST_MODEL: &str = "gpt-5.4-nano";

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::var("GIC_ALLOW_LIVE").as_deref() != Ok("1") {
        return Err(
            "refusing live request: set GIC_ALLOW_LIVE=1 after explicit authorization".into(),
        );
    }
    let key = std::env::var("GIC_OPENCODE_API_KEY")
        .map_err(|_| "set GIC_OPENCODE_API_KEY in your terminal environment")?;
    if key.is_empty() {
        return Err("GIC_OPENCODE_API_KEY is empty".into());
    }
    let client = openai::Client::builder()
        .api_key(key)
        .base_url(ZEN_BASE_URL)
        .build()?;
    let model = client.completion_model(CURATED_LOW_COST_MODEL);
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
