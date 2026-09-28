// ABOUTME: Searches the enabled example catalogue supplied by the editor.
// ABOUTME: Bounds matching results before source crosses into a tutor request.

use serde::{Deserialize, Serialize};

const MAX_QUERY_CHARS: usize = 200;
const MAX_RESULTS: usize = 3;
const MAX_SOURCE_CHARS: usize = 12_000;
const MAX_TOTAL_SOURCE_CHARS: usize = 24_000;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Example {
    pub id: String,
    pub title: String,
    pub categories: Vec<String>,
    pub tags: Vec<String>,
    pub description: String,
    pub source: String,
}

pub(crate) fn search_examples(query: &str, catalogue: &[Example]) -> Result<Vec<Example>, String> {
    let query = query.trim().to_lowercase();
    if query.is_empty() || query.chars().count() > MAX_QUERY_CHARS {
        return Err("Tutor could not complete a safe example lookup.".to_owned());
    }
    let terms = query
        .split(|character: char| !character.is_alphanumeric() && character != '_')
        .filter(|term| !term.is_empty())
        .collect::<Vec<_>>();
    let mut matches = catalogue
        .iter()
        .filter_map(|example| {
            let searchable = [example.title.as_str(), example.description.as_str()]
                .into_iter()
                .chain(example.categories.iter().map(String::as_str))
                .chain(example.tags.iter().map(String::as_str))
                .collect::<Vec<_>>()
                .join(" ")
                .to_lowercase();
            let score = terms
                .iter()
                .filter(|term| searchable.contains(**term))
                .count();
            (score > 0).then_some((score, example))
        })
        .collect::<Vec<_>>();
    matches.sort_by(|(left_score, left), (right_score, right)| {
        right_score
            .cmp(left_score)
            .then_with(|| left.title.cmp(&right.title))
            .then_with(|| left.id.cmp(&right.id))
    });

    let mut total_source_chars = 0;
    let mut results = Vec::new();
    for (_, example) in matches.into_iter().take(MAX_RESULTS) {
        let remaining = MAX_TOTAL_SOURCE_CHARS.saturating_sub(total_source_chars);
        if remaining == 0 {
            break;
        }
        let source_limit = MAX_SOURCE_CHARS.min(remaining);
        let source = example
            .source
            .chars()
            .take(source_limit)
            .collect::<String>();
        total_source_chars += source.chars().count();
        results.push(Example {
            id: example.id.clone(),
            title: example.title.chars().take(200).collect(),
            categories: example
                .categories
                .iter()
                .map(|v| v.chars().take(100).collect())
                .collect(),
            tags: example
                .tags
                .iter()
                .map(|v| v.chars().take(100).collect())
                .collect(),
            description: example.description.chars().take(1000).collect(),
            source,
        });
    }
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn example(
        id: &str,
        title: &str,
        categories: &[&str],
        tags: &[&str],
        description: &str,
        source: &str,
    ) -> Example {
        Example {
            id: id.to_owned(),
            title: title.to_owned(),
            categories: categories.iter().map(|s| (*s).to_owned()).collect(),
            tags: tags.iter().map(|s| (*s).to_owned()).collect(),
            description: description.to_owned(),
            source: source.to_owned(),
        }
    }

    #[test]
    fn finds_title_category_tag_and_description_and_orders_stably() {
        let catalogue = vec![
            example(
                "b",
                "Orbit",
                &["Shapes"],
                &["motion"],
                "A circle pattern",
                "circle();",
            ),
            example(
                "a",
                "Orbit",
                &["Shapes"],
                &["motion"],
                "A circle pattern",
                "rect();",
            ),
        ];

        for query in ["orbit", "shapes", "motion", "circle pattern"] {
            let matches = search_examples(query, &catalogue).unwrap();
            assert_eq!(
                matches
                    .iter()
                    .map(|item| item.id.as_str())
                    .collect::<Vec<_>>(),
                ["a", "b"]
            );
        }
    }

    #[test]
    fn rejects_malformed_or_oversized_queries_and_bounds_returned_source() {
        let catalogue = vec![example(
            "large",
            "Large",
            &[],
            &[],
            "large",
            &"x".repeat(30_000),
        )];
        assert!(search_examples("  ", &catalogue).is_err());
        assert!(search_examples(&"x".repeat(MAX_QUERY_CHARS + 1), &catalogue).is_err());
        let result = search_examples("large", &catalogue).unwrap();
        assert!(result[0].source.chars().count() <= MAX_SOURCE_CHARS);
    }
}
