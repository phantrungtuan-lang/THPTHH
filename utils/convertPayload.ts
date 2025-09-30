// utils/convertPayload.ts
type Payload = Record<string, any>;

const fieldMapping: Record<string, string> = {
  groupId: "group_id",
  leaderId: "leader_id",
  academicYearId: "academic_year_id",
};

export function convertPayload(
  formData: Payload,
  mode: "add" | "edit"
): { id?: string; payload: Payload } {
  let payload: Payload = { ...formData };
  let id: string | undefined;

  // Nếu là edit thì tách id ra
  if (mode === "edit" && payload.id) {
    id = payload.id;
    delete payload.id;
  }

  // Xử lý các foreign key
  Object.entries(fieldMapping).forEach(([camel, snake]) => {
    if (camel in payload) {
      payload[snake] = payload[camel] === "" ? null : payload[camel];
      delete payload[camel];
    }
  });

  // Xử lý password (nếu trống thì bỏ)
  if ("password" in payload && !payload.password) {
    delete payload.password;
  }

  return mode === "edit" ? { id, payload } : { payload };
}
