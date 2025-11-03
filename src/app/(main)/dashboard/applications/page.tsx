import { TableCards } from "./_components/table-cards";
import { type ApplicationTableRow } from "./_components/columns";
import connectMongoDB from "@/repository/mongoose";
import Application from "@/repository/models/application";

export const dynamic = "force-dynamic";

async function getApplicationsSSR(): Promise<ApplicationTableRow[]> {
  try {
    await connectMongoDB();
    const apps = await Application.find({}, "email firstName lastName status processedBy").lean();
    return (apps ?? []).map((a: any) => ({
      _id: String(a._id),
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      status: a.status,
      processedBy: a.processedBy,
    }));
  } catch {
    return [];
  }
}

export default async function Page() {
  const initialData = await getApplicationsSSR();

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <TableCards initialData={initialData} />
    </div>
  );
}
