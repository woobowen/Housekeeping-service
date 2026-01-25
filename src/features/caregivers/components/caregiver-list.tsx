'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, GraduationCap, Briefcase } from 'lucide-react';

// Define the shape of the caregiver data expected by this component
// This matches the return type of getCaregivers in actions.ts
interface Caregiver {
  idString: string;
  workerId: string;
  name: string;
  phone: string;
  status: string;
  workExpLevel: string | null;
  education: string | null;
  nativePlace: string | null;
  specialties: string[];
  cookingSkills: string[];
  languages: string[];
  // Add other fields if necessary
}

interface CaregiverListProps {
  data: Caregiver[];
}

export function CaregiverList({ data }: CaregiverListProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground mb-4">暂无护理员数据</p>
        <Button asChild>
          <Link href="/caregivers/new">创建新护理员</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((caregiver) => (
        <Card key={caregiver.idString} className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold">
              {caregiver.name}
            </CardTitle>
            <Badge variant={getStatusVariant(caregiver.status)}>
              {getStatusLabel(caregiver.status)}
            </Badge>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-sm text-muted-foreground space-y-2 mb-4">
              <div className="flex items-center">
                <Phone className="mr-2 h-4 w-4" />
                {caregiver.phone}
              </div>
              <div className="flex items-center">
                <Briefcase className="mr-2 h-4 w-4" />
                经验: {caregiver.workExpLevel || '未设置'}
              </div>
              {caregiver.nativePlace && (
                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  籍贯: {caregiver.nativePlace}
                </div>
              )}
               {caregiver.education && (
                <div className="flex items-center">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  学历: {caregiver.education}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {caregiver.specialties.slice(0, 5).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {caregiver.specialties.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{caregiver.specialties.length - 5}
                </Badge>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href={`/caregivers/${caregiver.idString}`}>
                查看详情
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// Helpers for status styling
function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'ACTIVE':
      return 'default'; // Using default (primary color) for Active
    case 'PENDING':
      return 'secondary';
    case 'BLACKLISTED':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待审核',
    ACTIVE: '在职',
    INACTIVE: '离职',
    SUSPENDED: '暂停',
    BLACKLISTED: '黑名单',
  };
  return map[status] || status;
}
