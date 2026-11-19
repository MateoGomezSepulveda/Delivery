import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { UserAvatar } from '@/components/ui/UserAvatar';

describe('UserAvatar', () => {
  it('renders image with referrerPolicy="no-referrer" for Google/external avatars', () => {
    render(
      <UserAvatar
        src="https://lh3.googleusercontent.com/a/example=s96-c"
        name="Mateo Gomez"
      />,
    );

    const img = screen.getByRole('img', { name: 'Mateo Gomez' });
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(img).toHaveAttribute(
      'src',
      'https://lh3.googleusercontent.com/a/example=s96-c',
    );
  });

  it('falls back to initials cleanly if image fails to load and recovers when src changes', () => {
    const { rerender } = render(
      <UserAvatar src="https://broken.example/avatar.jpg" name="Mateo Gomez" />,
    );

    const img = screen.getByRole('img', { name: 'Mateo Gomez' });
    fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('MG')).toBeInTheDocument();

    rerender(
      <UserAvatar src="https://valid.example/new-avatar.jpg" name="Mateo Gomez" />,
    );

    const nextImg = screen.getByRole('img', { name: 'Mateo Gomez' });
    expect(nextImg).toHaveAttribute(
      'src',
      'https://valid.example/new-avatar.jpg',
    );
  });
});
