CREDENTIALS_FILE="$HOME/hyprnote-r2.toml"
ENDPOINT_URL="https://3db5267cdeb5f79263ede3ec58090fe0.r2.cloudflarestorage.com"
BUCKET="hyprnote-cache2"

FROM_PATH="s3://$BUCKET/v0/ggerganov/whisper.cpp/main/*"
TO_PATH="./out/"

AWS_REGION=auto s5cmd \
    --log trace \
    --credentials-file "$CREDENTIALS_FILE" \
    --endpoint-url "$ENDPOINT_URL" \
    cp "$FROM_PATH" "$TO_PATH"
