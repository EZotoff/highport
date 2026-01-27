"""Text chunking service for document ingestion.

Uses tiktoken with cl100k_base encoding (GPT-4 compatible) for accurate token counting.
"""

import tiktoken


def chunk_text(
    text: str, target_tokens: int = 500, overlap_tokens: int = 50
) -> list[str]:
    """Split text into chunks of approximately target_tokens with overlap.

    Args:
        text: The text to chunk.
        target_tokens: Target number of tokens per chunk.
        overlap_tokens: Number of tokens to overlap between chunks.

    Returns:
        List of text chunks.
    """
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)

    if len(tokens) <= target_tokens:
        return [text]

    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + target_tokens, len(tokens))
        chunk_tokens = tokens[start:end]
        chunks.append(enc.decode(chunk_tokens))
        if end >= len(tokens):
            break
        start = end - overlap_tokens

    return chunks


def count_tokens(text: str) -> int:
    """Count the number of tokens in text.

    Args:
        text: The text to count tokens for.

    Returns:
        Number of tokens.
    """
    enc = tiktoken.get_encoding("cl100k_base")
    return len(enc.encode(text))
