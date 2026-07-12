class Work < ApplicationRecord
  belongs_to :user

  validates :title, presence: true

  URL_FORMAT = { with: %r{\Ahttps?://}, message: "はhttp(s)://で始まる必要があります" }.freeze
  validates :video_url,     format: URL_FORMAT, allow_blank: true
  validates :thumbnail_url, format: URL_FORMAT, allow_blank: true
  validates :github_url,    format: URL_FORMAT, allow_blank: true
  validates :demo_url,      format: URL_FORMAT, allow_blank: true

  scope :published, -> { where(published: true) }
  scope :ordered,   -> { order(:position) }

  before_create :set_default_position

  private

  def set_default_position
    self.position ||= (Work.maximum(:position) || 0) + 1
  end
end