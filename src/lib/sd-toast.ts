import toast from "react-hot-toast";

export function txSuccessToast() {
  toast.success("✅ İşlem eklendi");
}

export function txDeletedToast() {
  toast.success("🗑️ İşlem silindi");
}

export function txUpdatedToast() {
  toast.success("✅ İşlem güncellendi");
}

export function errToast(message: string) {
  toast.error(`❌ Hata: ${message}`);
}

export function contactAddedToast() {
  toast.success("✅ Kişi eklendi");
}
