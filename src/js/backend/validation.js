export function normalizeAuthInput(value) {
    return String(value || "").trim();
}

export function validateAuthInput(email, username, password) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !username || !password) {
        return "Email, username and password are required.";
    }

    if (!emailRegex.test(email)) {
        return "Invalid email format.";
    }

    if (username.length < 5 || username.length > 20) {
        return "Username must be between 5 and 20 characters.";
    }

    if (password.length < 8 || password.length > 64) {
        return "Password must be between 8 and 64 characters.";
    }

    return null;
}

export function parsePositiveInt(value) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

export function validateTextField(value, fieldName, minLength, maxLength) {
    const normalizedValue = String(value || "").trim();

    if (normalizedValue.length < minLength || normalizedValue.length > maxLength) {
        return `${fieldName} must be between ${minLength} and ${maxLength} characters.`;
    }

    return null;
}

export function validateNoteInput(title, content, category, color) {
    const normalizedTitle = String(title || "").trim();
    const normalizedContent = String(content || "").trim();
    const normalizedCategory = String(category || "").trim();
    const normalizedColor = String(color || "").trim();

    if (!normalizedTitle) {
        return "Title is required.";
    }

    if (normalizedTitle.length > 100) {
        return "Title cannot be longer than 100 characters.";
    }

    if (normalizedContent.length > 5000) {
        return "Content cannot be longer than 5000 characters.";
    }

    if (normalizedCategory.length > 30) {
        return "Category cannot be longer than 30 characters.";
    }

    if (normalizedColor.length > 20) {
        return "Color value is too long.";
    }

    return null;
}

export function validateTitleSuggestionInput(title, content) {
    const normalizedTitle = String(title || "").trim();
    const normalizedContent = String(content || "").trim();

    if (!normalizedTitle && !normalizedContent) {
        return "Please provide a title draft or note content.";
    }

    if (normalizedTitle.length > 50) {
        return "Title draft is too long.";
    }

    if (normalizedContent.length > 5000) {
        return "Content is too long.";
    }

    return null;
}

export function validateContentSuggestionInput(title) {
    const normalizedTitle = String(title || "").trim();

    if (!normalizedTitle) {
        return "Please provide a title first.";
    }

    if (normalizedTitle.length > 100) {
        return "Title is too long.";
    }

    return null;
}

export function validateCategoryName(name) {
    const normalizedName = String(name || "").trim();

    if (!normalizedName) {
        return "Category name is required.";
    }

    if (normalizedName.length > 30) {
        return "Category name cannot be longer than 30 characters.";
    }

    return null;
}

export function validateShareCode(code) {
    const normalizedCode = String(code || "").trim().toUpperCase();

    if (!normalizedCode) {
        return null;
    }

    if (!/^[A-Z2-9]{10}$/.test(normalizedCode)) {
        return "Invalid share code.";
    }

    return null;
}

export function parseSharedUsers(value) {
    return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export function buildSharedUsersValue(users) {
    return Array.from(new Set(users.map((item) => String(item || "").trim()).filter(Boolean))).join(",");
}
