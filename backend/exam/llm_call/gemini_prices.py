pricing = {
    "gemini-2.5-pro": {
        (0, 200_000): {"input": 1.25, "output": 10},
        (200_001, float('inf')): {"input": 2.5, "output": 15},
    },
    "gemini-2.5-flash": {
        (0, float('inf')): {"input": 0.15, "output": 3.5},
    },
    "gemini-2.5-pro-flash": {
        (0, float('inf')): {"input": 1.25, "output": 10},
    },
    "gemini-2.0-flash": {
        (0, float('inf')): {"input": 0.1, "output": 0.4},
    },
    "gemini-2.0-flash-lite": {
        (0, float('inf')): {"input": 0.075, "output": 0.3},
    },
    "gemini-2.0-flash-experimental": {
        (0, float('inf')): {"input": 0.1, "output": 0.4},
    },
    "gemini-2.0-experimental": {
        (0, float('inf')): {"input": 0.1, "output": 0.4},
    },
    "gemini-1.5-flash-lite": {
        (0, float('inf')): {"input": 0.075, "output": 0.3},
    },
    "gemini-1.5-flash": {
        (0, 128_000): {"input": 0.075, "output": 0.3},
        (128_001, float('inf')): {"input": 0.15, "output": 0.6},
    },
    "gemini-1.5-flash-8b": {
        (0, 128_000): {"input": 0.0375, "output": 0.15},
        (128_001, float('inf')): {"input": 0.075, "output": 0.3},
    },
    "gemini-1.5-pro": {
        (0, 128_000): {"input": 1.25, "output": 5},
        (128_001, float('inf')): {"input": 2.5, "output": 10},
    },
}

