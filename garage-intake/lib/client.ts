export async function request<T>(url: string, payload?: unknown): Promise<T> {
  const response=await fetch(url,{
    method:payload===undefined?"GET":"POST",
    headers:payload===undefined?{}:{"Content-Type":"application/json"},
    body:payload===undefined?undefined:JSON.stringify(payload),
    cache:"no-store"
  });
  const value=await response.json();
  if(!response.ok)throw new Error(value.error||"Please try again.");
  return value as T;
}
