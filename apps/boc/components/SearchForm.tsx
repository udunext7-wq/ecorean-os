// GET 방식 검색 폼 — 서버 컴포넌트 페이지에서 searchParams 로 수신
import { Input, Button } from '@/core/ui';

export function SearchForm({
  action,
  placeholder,
  defaultValue,
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <form action={action} method="get" className="mb-4 flex gap-2">
      <Input name="q" placeholder={placeholder} defaultValue={defaultValue} className="w-72" />
      <Button type="submit" variant="secondary">
        검색
      </Button>
    </form>
  );
}
