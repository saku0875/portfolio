class Post < ApplicationRecord
  belongs_to :user

  validates :title, presence: true
  validates :url,   presence: true, format: { with: %r{\Ahttps?://}, message: "はhttp(s)://で始まる必要があります" }

  scope :published, -> { where(published: true) }

  before_save :set_published_at

  private

  def set_published_at
    self.published_at = Time.current if published && published_at.nil?
  end
end