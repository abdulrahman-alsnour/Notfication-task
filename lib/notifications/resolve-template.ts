type ScopeMappings = Record<string, { phone?: string; name?: string }>;

const defaultMappings: Record<string, string> = { phone: "phone", name: "name" };

function getFieldValue(recipient: Record<string, unknown>, field: string): string {
  const v = recipient[field];
  if (v === null || v === undefined) return "";
  return String(v).trim();
}


export function resolveTemplateBody(
  templateBody: string,
  recipient: Record<string, unknown>,
  scope: string,
  scopeMappings: ScopeMappings = {}
): string {
  const mapping = scopeMappings[scope] || {};
  const nameField = mapping.name ?? defaultMappings.name;
  const phoneField = mapping.phone ?? defaultMappings.phone;

  const recipientObj = recipient;
  const name = getFieldValue(recipientObj, nameField) || getFieldValue(recipientObj, "name");
  const phone = getFieldValue(recipientObj, phoneField) || getFieldValue(recipientObj, "phone");
  const email = getFieldValue(recipientObj, "email");

  const replacements: Record<string, string> = {
    name,
    phone,
    email,
    ...Object.fromEntries(
      Object.entries(recipientObj).filter(
        ([, v]) => v !== null && v !== undefined && typeof v !== "object"
      ).map(([k, v]) => [k, String(v)])
    ),
  };

  let out = templateBody;
  for (const [key, value] of Object.entries(replacements)) {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    out = out.replace(re, value);
  }
  return out;
}
