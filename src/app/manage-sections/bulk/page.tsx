import { BulkUploadWorkspace } from "@/components/sections/BulkUploadWorkspace";

// A static segment, so it wins over the sibling [id] route. Section ids are
// numeric, so "bulk" could never have been one of them anyway.
export default function BulkUploadPage() {
  return <BulkUploadWorkspace />;
}
