import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Users, BookOpen, ArrowRight, BookMarked } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const features = [
    {
      icon: Palette,
      title: 'Story Builder',
      description: 'Create stunning visual stories with panels, layouts, and rich formatting.',
      href: '/graphic-novel-builder',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20'
    },
    {
      icon: Users,
      title: 'Asset Library',
      description: 'Manage your character library and reference images in one place.',
      href: '/assets',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20'
    },
    {
      icon: BookOpen,
      title: 'My Stories',
      description: 'View and organize your completed storybook pages in collections.',
      href: '/saved-pages',
      color: 'text-rose-500',
      bgColor: 'bg-rose-50 dark:bg-rose-950/20'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-xl">
              <BookMarked className="h-9 w-9 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            Storybook Builder
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Your creative canvas for building visual stories, comics, and illustrated narratives.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link key={index} to={feature.href} className="group">
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-border/50 hover:border-orange-500/50">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl group-hover:text-orange-500 transition-colors flex items-center justify-between">
                      {feature.title}
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;