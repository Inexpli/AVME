export const riskColor = (l) => ({ low: "#1D9E75", medium: "#BA7517", high: "#D85A30", critical: "#E24B4A" }[l] || "#888");
export const statusColor = (s) => ({
  active: "#1D9E75", pending_validation: "#BA7517", suspended: "#D85A30", blacklisted: "#E24B4A",
  validated: "#1D9E75", processing: "#185FA5", validation_failed: "#E24B4A", error: "#E24B4A",
  draft: "#888780", expired: "#888780", terminated: "#E24B4A",
}[s] || "#888");
export const statusBg = (s) => ({
  active: "#E1F5EE", pending_validation: "#FAEEDA", suspended: "#FAECE7", blacklisted: "#FCEBEB",
  validated: "#E1F5EE", processing: "#E6F1FB", validation_failed: "#FCEBEB", error: "#FCEBEB",
  draft: "#F1EFE8", expired: "#F1EFE8", terminated: "#FCEBEB",
  low: "#E1F5EE", medium: "#FAEEDA", high: "#FAECE7", critical: "#FCEBEB",
}[s] || "#F1EFE8");
