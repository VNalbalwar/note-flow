"use client";
import Document from "@/components/Document";
import { useParams } from "next/navigation";

function DocumentPage() {
  // Use React.use() to unwrap the params Promise
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id; // Ensure it's a single string, not an array

  if(!id){
    return <div>Loading....</div>
  }

  return (<div className="flex flex-col flex-1 min-h-screen">
    {/* id is now guaranteed to be a string */}
    <Document id={id}/>
  </div>
  );
}

export default DocumentPage;

