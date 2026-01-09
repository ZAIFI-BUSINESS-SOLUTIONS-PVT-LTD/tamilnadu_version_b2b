"""
Helper utilities for working with misconception data stored in StudentResult.

The misconception field stores JSON with both type and text:
{
  "type": "Conceptual Confusion",
  "text": "Student confused X with Y"
}

These helpers provide backward-compatible parsing and display.
"""
import json
import logging

logger = logging.getLogger(__name__)


def parse_misconception(misconception_field):
    """
    Parse misconception field from StudentResult.
    
    Args:
        misconception_field: String containing either JSON dict or plain text
    
    Returns:
        dict with 'type' and 'text' keys, or None if empty/invalid
        Example: {'type': 'Conceptual Confusion', 'text': 'Student confused...'}
    """
    if not misconception_field:
        return None
    
    # Try to parse as JSON first (new format)
    try:
        data = json.loads(misconception_field)
        if isinstance(data, dict) and 'type' in data and 'text' in data:
            return {
                'type': data['type'],
                'text': data['text']
            }
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Fallback: treat as plain text (legacy format)
    return {
        'type': None,
        'text': str(misconception_field)
    }


def format_misconception_display(misconception_field, include_type=True):
    """
    Format misconception for display to users.
    
    Args:
        misconception_field: String from StudentResult.misconception
        include_type: Whether to include the type in the output
    
    Returns:
        String formatted for display, or None if empty
    """
    parsed = parse_misconception(misconception_field)
    if not parsed:
        return None
    
    if include_type and parsed['type']:
        return f"[{parsed['type']}] {parsed['text']}"
    else:
        return parsed['text']


def get_misconception_type(misconception_field):
    """
    Extract just the misconception type.
    
    Args:
        misconception_field: String from StudentResult.misconception
    
    Returns:
        String with misconception type, or None if not available
    """
    parsed = parse_misconception(misconception_field)
    return parsed['type'] if parsed else None


def get_misconception_text(misconception_field):
    """
    Extract just the misconception text.
    
    Args:
        misconception_field: String from StudentResult.misconception
    
    Returns:
        String with misconception text, or None if not available
    """
    parsed = parse_misconception(misconception_field)
    return parsed['text'] if parsed else None
