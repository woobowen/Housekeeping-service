import { CaregiverForm } from "@/features/caregivers/components/caregiver-form";

export default function NewCaregiverPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">录入新阿姨</h1>
        <p className="text-muted-foreground">
          请填写护理员的详细信息，完成三步录入流程。
        </p>
      </div>
      <CaregiverForm />
    </div>
  );
}
