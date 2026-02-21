'use client';

import { useState } from 'react';
import { addGlobalField, removeGlobalField, updateGlobalField, type GlobalFieldConfig, type FieldDefinition } from '@/features/system/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Trash2, Plus, GripVertical, Pencil } from 'lucide-react';

interface GlobalFieldManagerProps {
  initialConfig: GlobalFieldConfig;
}

export function GlobalFieldManager({ initialConfig }: GlobalFieldManagerProps) {
  // We use local state for optimistic UI, though server actions revalidate path
  const [config, setConfig] = useState<GlobalFieldConfig>(initialConfig);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Form State for Adding/Editing
  const [activeSection, setActiveSection] = useState('basic_info');
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null); // If set, we are editing
  
  const [fieldKey, setFieldKey] = useState(''); // Only used for display in edit mode or generation in create
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'date' | 'select' | 'boolean'>('text');
  const [fieldOptions, setFieldOptions] = useState('');

  const sections = [
    { key: 'basic_info', label: '基本信息扩展' },
    { key: 'skills', label: '专业技能扩展' },
  ];

  const resetForm = () => {
    setEditingFieldKey(null);
    setFieldKey('');
    setFieldLabel('');
    setFieldType('text');
    setFieldOptions('');
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (field: FieldDefinition) => {
    setEditingFieldKey(field.name);
    setFieldKey(field.name);
    setFieldLabel(field.label);
    setFieldType(field.type);
    setFieldOptions(field.options ? field.options.join(',') : '');
    setIsDialogOpen(true);
  };

  const handleSaveField = async () => {
    if (!fieldLabel) {
      toast.error('显示名称不能为空');
      return;
    }

    setIsPending(true);

    if (editingFieldKey) {
      // --- Update Logic ---
      const updatedField: FieldDefinition = {
        name: editingFieldKey, // Key is immutable
        label: fieldLabel,
        type: fieldType,
        options: fieldType === 'select' ? fieldOptions.split(/[,，]/).map(s => s.trim()).filter(Boolean) : undefined,
        required: false 
      };

      const result = await updateGlobalField(activeSection, editingFieldKey, updatedField);

      if (result.success) {
        toast.success('字段更新成功');
        setIsDialogOpen(false);
        
        // Optimistic Update
        const updatedConfig = { ...config };
        const sectionFields = updatedConfig.sections[activeSection] || [];
        const index = sectionFields.findIndex(f => f.name === editingFieldKey);
        if (index !== -1) {
          sectionFields[index] = updatedField;
        }
        setConfig(updatedConfig);
      } else {
        toast.error(result.message);
      }

    } else {
      // --- Create Logic ---
      const isEnglish = /^[a-zA-Z0-9_]+$/.test(fieldLabel);
      const generatedKey = isEnglish 
        ? fieldLabel.toLowerCase() 
        : `field_${Math.random().toString(36).substr(2, 9)}`;

      const newField: FieldDefinition = {
        name: generatedKey,
        label: fieldLabel,
        type: fieldType,
        options: fieldType === 'select' ? fieldOptions.split(/[,，]/).map(s => s.trim()).filter(Boolean) : undefined,
        required: false 
      };

      const result = await addGlobalField(activeSection, newField);

      if (result.success) {
        toast.success('字段添加成功');
        setIsDialogOpen(false);
        
        // Optimistic Update
        const updatedConfig = { ...config };
        if (!updatedConfig.sections[activeSection]) updatedConfig.sections[activeSection] = [];
        updatedConfig.sections[activeSection].push(newField);
        setConfig(updatedConfig);
      } else {
        toast.error(result.message);
      }
    }
    
    setIsPending(false);
  };

  const handleRemoveField = async (section: string, name: string) => {
    if (!confirm('确定删除此字段吗？历史数据可能无法显示。')) return;

    const result = await removeGlobalField(section, name);
    if (result.success) {
      toast.success('删除成功');
      const updatedConfig = { ...config };
      updatedConfig.sections[section] = updatedConfig.sections[section].filter(f => f.name !== name);
      setConfig(updatedConfig);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">字段配置预览</h2>
        
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" /> 添加新字段
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsDialogOpen(open);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFieldKey ? '编辑字段' : `添加字段: ${sections.find(s => s.key === activeSection)?.label}`}</DialogTitle>
              <DialogDescription>
                自定义字段将显示在护理员表单的对应区域中。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              
              {/* Only show Key field in Edit mode for reference, strictly read-only */}
              {editingFieldKey && (
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-muted-foreground">
                    字段Key
                  </Label>
                  <Input
                    value={fieldKey}
                    disabled
                    className="col-span-3 bg-muted"
                  />
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="label" className="text-right">
                  显示名称
                </Label>
                <Input
                  id="label"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  placeholder="例如: 星座"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  字段类型
                </Label>
                <Select 
                  value={fieldType} 
                  onValueChange={(v) => setFieldType(v as 'text' | 'number' | 'date' | 'select' | 'boolean')}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">文本 (Text)</SelectItem>
                    <SelectItem value="number">数字 (Number)</SelectItem>
                    <SelectItem value="date">日期 (Date)</SelectItem>
                    <SelectItem value="boolean">开关 (Yes/No)</SelectItem>
                    <SelectItem value="select">下拉单选 (Select)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {fieldType === 'select' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="options" className="text-right">
                    选项
                  </Label>
                  <Input
                    id="options"
                    value={fieldOptions}
                    onChange={(e) => setFieldOptions(e.target.value)}
                    placeholder="逗号分隔，例如: A,B,C"
                    className="col-span-3"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleSaveField} disabled={isPending}>
                {isPending ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {sections.map(section => (
            <TabsTrigger key={section.key} value={section.key}>{section.label}</TabsTrigger>
          ))}
        </TabsList>
        
        {sections.map(section => (
          <TabsContent key={section.key} value={section.key}>
            <Card>
              <CardHeader>
                <CardTitle>{section.label}</CardTitle>
                <CardDescription>
                  管理{section.label}的自定义字段。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(config.sections[section.key] || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                    暂无自定义字段
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {(config.sections[section.key] || []).map((field) => (
                      <div
                        key={field.name}
                        className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <GripVertical className="h-5 w-5 text-muted-foreground/50 cursor-move" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{field.label}</span>
                              <Badge variant="secondary" className="text-xs font-mono">
                                {field.name}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground flex gap-2">
                              <Badge variant="outline" className="uppercase text-[10px]">
                                {field.type}
                              </Badge>
                              {field.options && field.options.length > 0 && (
                                <span>选项: {field.options.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => openEditDialog(field)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveField(section.key, field.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}