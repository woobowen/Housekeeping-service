'use client';

import { useState, useEffect } from 'react';
import { addField, deleteField, getFields } from '@/features/settings/field-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

interface FieldManagerProps {
  targetModel: string;
}

type Field = {
  id: string;
  name: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
};

export function FieldManager({ targetModel }: FieldManagerProps) {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [label, setLabel] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('TEXT');
  const [optionsStr, setOptionsStr] = useState('');
  const [required, setRequired] = useState(false);

  // Load fields
  const loadFields = async () => {
    const data = await getFields(targetModel);
    // Safe casting since we know the shape from action
    setFields(data as any);
  };

  useEffect(() => {
    loadFields();
  }, [targetModel]);

  const handleLabelChange = (val: string) => {
    setLabel(val);
  };

  const handleAdd = async () => {
    if (!label || !name || !type) {
      toast.error('请填写必要信息');
      return;
    }

    setLoading(true);
    const optionsArray = type === 'SELECT' ? optionsStr.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];

    const result = await addField({
      targetModel,
      label,
      name,
      type,
      options: optionsArray,
      required
    });

    if (result.success) {
      toast.success('字段添加成功');
      // Reset form
      setLabel('');
      setName('');
      setType('TEXT');
      setOptionsStr('');
      setRequired(false);
      // Reload
      loadFields();
    } else {
      toast.error(result.message || '添加失败');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该字段吗？这将影响现有数据展示。')) return;
    
    const result = await deleteField(id);
    if (result.success) {
      toast.success('已删除');
      loadFields();
    } else {
      toast.error('删除失败');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{targetModel === 'Caregiver' ? '阿姨' : '订单'}自定义字段管理</CardTitle>
        <CardDescription>配置系统的动态扩展字段</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* List of Existing Fields */}
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">已配置字段</h3>
            {fields.length === 0 && <p className="text-sm text-gray-400">暂无自定义字段</p>}
            <div className="grid gap-2">
                {fields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between p-3 border rounded-md bg-white">
                        <div className="flex gap-4 items-center">
                            <span className="font-medium text-sm w-24 truncate" title={field.label}>{field.label}</span>
                            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1 rounded">{field.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{field.type}</span>
                            {field.required && <span className="text-xs text-red-500">必填</span>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(field.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>

        <div className="border-t pt-6">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4" /> 添加新字段
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                    <Label>显示名称 (Label)</Label>
                    <Input placeholder="例如：属相" value={label} onChange={(e) => handleLabelChange(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>字段键名 (Key)</Label>
                    <Input placeholder="例如：zodiac (仅限英文)" value={name} onChange={(e) => setName(e.target.value)} />
                    <p className="text-[10px] text-gray-400">必须是唯一的英文标识符</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                    <Label>字段类型</Label>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TEXT">文本 (Text)</SelectItem>
                            <SelectItem value="NUMBER">数字 (Number)</SelectItem>
                            <SelectItem value="DATE">日期 (Date)</SelectItem>
                            <SelectItem value="SELECT">下拉选择 (Select)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 
                 {type === 'SELECT' && (
                    <div className="space-y-2">
                        <Label>选项列表 (逗号分隔)</Label>
                        <Input placeholder="鼠,牛,虎,兔..." value={optionsStr} onChange={(e) => setOptionsStr(e.target.value)} />
                    </div>
                 )}
            </div>

            <div className="flex items-center space-x-2 mb-6">
                <Checkbox id="req" checked={required} onCheckedChange={(c) => setRequired(!!c)} />
                <Label htmlFor="req">设为必填项</Label>
            </div>

            <Button onClick={handleAdd} disabled={loading} className="w-full md:w-auto">
                {loading ? '保存中...' : '保存字段配置'}
            </Button>
        </div>

      </CardContent>
    </Card>
  );
}
