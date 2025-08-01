pub static SUPPORTED_MODELS: &[SupportedModel] = &[
    SupportedModel::QuantizedTiny,
    SupportedModel::QuantizedTinyEn,
    SupportedModel::QuantizedBase,
    SupportedModel::QuantizedBaseEn,
    SupportedModel::QuantizedSmall,
    SupportedModel::QuantizedSmallEn,
    SupportedModel::QuantizedLargeTurbo,
];

#[derive(Debug, Eq, Hash, PartialEq, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum SupportedModel {
    QuantizedTiny,
    QuantizedTinyEn,
    QuantizedBase,
    QuantizedBaseEn,
    QuantizedSmall,
    QuantizedSmallEn,
    QuantizedLargeTurbo,
}

impl SupportedModel {
    pub fn file_name(&self) -> &str {
        match self {
            SupportedModel::QuantizedTiny => "ggml-tiny-q8_0.bin",
            SupportedModel::QuantizedTinyEn => "ggml-tiny.en-q8_0.bin",
            SupportedModel::QuantizedBase => "ggml-base-q8_0.bin",
            SupportedModel::QuantizedBaseEn => "ggml-base.en-q8_0.bin",
            SupportedModel::QuantizedSmall => "ggml-small-q8_0.bin",
            SupportedModel::QuantizedSmallEn => "ggml-small.en-q8_0.bin",
            SupportedModel::QuantizedLargeTurbo => "ggml-large-v3-turbo-q8_0.bin",
        }
    }

    pub fn model_url(&self) -> &str {
        match self {
            SupportedModel::QuantizedTiny => "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-tiny-q8_0.bin",
            SupportedModel::QuantizedTinyEn => "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-tiny.en-q8_0.bin",
            SupportedModel::QuantizedBase => "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-base-q8_0.bin",
            SupportedModel::QuantizedBaseEn => "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-base.en-q8_0.bin",
            SupportedModel::QuantizedSmall => "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-small-q8_0.bin",
            SupportedModel::QuantizedSmallEn => "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-small.en-q8_0.bin",
            SupportedModel::QuantizedLargeTurbo => "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-large-v3-turbo-q8_0.bin",
        }
    }

    pub fn model_size(&self) -> u64 {
        match self {
            SupportedModel::QuantizedTiny => 43537433,
            SupportedModel::QuantizedTinyEn => 43550795,
            SupportedModel::QuantizedBase => 81768585,
            SupportedModel::QuantizedBaseEn => 81781811,
            SupportedModel::QuantizedSmall => 264464607,
            SupportedModel::QuantizedSmallEn => 264477561,
            SupportedModel::QuantizedLargeTurbo => 874188075,
        }
    }
}
